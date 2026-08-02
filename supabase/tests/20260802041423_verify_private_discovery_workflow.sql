-- Run only against a disposable local/test database after applying the migration.
-- The transaction is always rolled back and must never use production credentials.

begin;

do $$
declare
  workflow_table text;
begin
  foreach workflow_table in array array[
    'facility_source_runs',
    'facility_source_observations',
    'facility_candidates',
    'facility_candidate_sources',
    'facility_external_ids'
  ]
  loop
    if to_regclass(format('discovery_private.%I', workflow_table)) is null then
      raise exception 'Missing workflow table: %', workflow_table;
    end if;
  end loop;

  if to_regclass('public.residenciales') is null then
    raise exception 'public.residenciales must remain present';
  end if;
end;
$$;

do $$
declare
  workflow_table text;
  rls_enabled boolean;
  rls_forced boolean;
begin
  foreach workflow_table in array array[
    'facility_source_runs',
    'facility_source_observations',
    'facility_candidates',
    'facility_candidate_sources',
    'facility_external_ids'
  ]
  loop
    select class.relrowsecurity, class.relforcerowsecurity
      into rls_enabled, rls_forced
    from pg_class as class
    join pg_namespace as namespace on namespace.oid = class.relnamespace
    where namespace.nspname = 'discovery_private'
      and class.relname = workflow_table;

    if not coalesce(rls_enabled, false) or not coalesce(rls_forced, false) then
      raise exception 'RLS is not enabled and forced on %', workflow_table;
    end if;

    if has_table_privilege('anon', format('discovery_private.%I', workflow_table), 'select')
      or has_table_privilege('anon', format('discovery_private.%I', workflow_table), 'insert')
      or has_table_privilege('anon', format('discovery_private.%I', workflow_table), 'update')
      or has_table_privilege('anon', format('discovery_private.%I', workflow_table), 'delete')
      or has_table_privilege('authenticated', format('discovery_private.%I', workflow_table), 'select')
      or has_table_privilege('authenticated', format('discovery_private.%I', workflow_table), 'insert')
      or has_table_privilege('authenticated', format('discovery_private.%I', workflow_table), 'update')
      or has_table_privilege('authenticated', format('discovery_private.%I', workflow_table), 'delete')
    then
      raise exception 'Browser role has a direct privilege on %', workflow_table;
    end if;
  end loop;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'discovery_private'
      and tablename = any (array[
        'facility_source_runs',
        'facility_source_observations',
        'facility_candidates',
        'facility_candidate_sources',
        'facility_external_ids'
      ])
  ) then
    raise exception 'Phase 1 must not create Data API policies';
  end if;
end;
$$;

insert into discovery_private.facility_source_runs (
  run_key,
  source_type,
  source_url,
  source_license,
  status,
  completed_at,
  observation_count
) values (
  'phase1-verification-official',
  'official',
  'https://example.test/official-register',
  'Verification fixture only',
  'succeeded',
  now(),
  1
);

insert into discovery_private.facility_source_observations (
  run_id,
  source_type,
  source_record_key,
  source_url,
  retrieved_at,
  source_date,
  source_license,
  normalized_name,
  normalized_department,
  normalized_locality,
  normalized_address,
  record_hash
)
select
  run.id,
  run.source_type,
  'fixture-001',
  'https://example.test/official-register/fixture-001',
  now(),
  current_date,
  'Verification fixture only',
  'residencial de prueba',
  'montevideo',
  'montevideo',
  'calle de prueba 100',
  repeat('a', 64)
from discovery_private.facility_source_runs as run
where run.run_key = 'phase1-verification-official';

insert into discovery_private.facility_candidates (
  candidate_key,
  status,
  normalized_name,
  normalized_department,
  normalized_locality,
  normalized_address,
  evidence_tier,
  human_reviewed,
  reviewed_at,
  reviewed_by
) values (
  'phase1-verification-candidate',
  'verified_new',
  'residencial de prueba',
  'montevideo',
  'montevideo',
  'calle de prueba 100',
  'A',
  true,
  now(),
  'verification-test'
);

insert into discovery_private.facility_candidate_sources (
  candidate_id,
  observation_id,
  evidence_role,
  independence_key,
  link_method,
  linked_by
)
select
  candidate.id,
  observation.id,
  'evidence_a',
  'verification-official-source',
  'human',
  'verification-test'
from discovery_private.facility_candidates as candidate
cross join discovery_private.facility_source_observations as observation
where candidate.candidate_key = 'phase1-verification-candidate'
  and observation.source_record_key = 'fixture-001';

update discovery_private.facility_candidates
set public_eligible = true,
    updated_at = now()
where candidate_key = 'phase1-verification-candidate';

do $$
begin
  begin
    insert into discovery_private.facility_candidates (
      candidate_key,
      status,
      normalized_name,
      evidence_tier,
      human_reviewed,
      reviewed_at,
      reviewed_by,
      public_eligible
    ) values (
      'phase1-invalid-public-candidate',
      'discovered',
      'invalid public candidate',
      'C',
      false,
      null,
      null,
      true
    );
    raise exception 'Expected invalid public_eligible candidate to fail';
  exception
    when check_violation then null;
  end;

  begin
    insert into discovery_private.facility_source_observations (
      run_id,
      source_type,
      source_record_key,
      source_url,
      retrieved_at,
      storage_policy,
      raw_metadata_storage_permitted,
      raw_metadata,
      record_hash
    )
    select
      run.id,
      run.source_type,
      'fixture-invalid-raw',
      'https://example.test/official-register/fixture-invalid-raw',
      now(),
      'normalized_only',
      false,
      '{"forbidden": true}'::jsonb,
      repeat('b', 64)
    from discovery_private.facility_source_runs as run
    where run.run_key = 'phase1-verification-official';
    raise exception 'Expected unpermitted raw metadata to fail';
  exception
    when check_violation then null;
  end;
end;
$$;

select
  candidate.candidate_key,
  candidate.status,
  candidate.evidence_tier,
  candidate.human_reviewed,
  candidate.public_eligible,
  count(candidate_source.observation_id) as linked_observations
from discovery_private.facility_candidates as candidate
left join discovery_private.facility_candidate_sources as candidate_source
  on candidate_source.candidate_id = candidate.id
where candidate.candidate_key = 'phase1-verification-candidate'
group by candidate.id;

select
  constraint_table.table_name,
  constraint_table.constraint_name,
  constraint_table.constraint_type
from information_schema.table_constraints as constraint_table
where constraint_table.table_schema = 'discovery_private'
order by constraint_table.table_name, constraint_table.constraint_name;

rollback;
