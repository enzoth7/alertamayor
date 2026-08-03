-- Run only against a disposable local/test database after the forward migration.
-- Every fixture is enclosed in a transaction and rolled back.

begin;

do $$
declare
  table_name text;
  rls_enabled boolean;
  rls_forced boolean;
begin
  foreach table_name in array array[
    'source_catalog',
    'organizations',
    'facilities',
    'facility_operators',
    'facility_names',
    'facility_addresses',
    'facility_contacts',
    'facility_social_accounts',
    'facility_observation_links',
    'facility_administrative_events',
    'facility_capacity_observations',
    'facility_geocodes',
    'facility_reviews',
    'audit_log',
    'legacy_facility_map'
  ] loop
    if to_regclass(format('elepem_core.%I', table_name)) is null then
      raise exception 'Missing normalized table: %', table_name;
    end if;

    select class.relrowsecurity, class.relforcerowsecurity
      into rls_enabled, rls_forced
    from pg_class as class
    join pg_namespace as namespace on namespace.oid = class.relnamespace
    where namespace.nspname = 'elepem_core'
      and class.relname = table_name;

    if not coalesce(rls_enabled, false) or not coalesce(rls_forced, false) then
      raise exception 'RLS is not enabled and forced on %', table_name;
    end if;

    if has_table_privilege('anon', format('elepem_core.%I', table_name), 'select')
      or has_table_privilege('anon', format('elepem_core.%I', table_name), 'insert')
      or has_table_privilege('anon', format('elepem_core.%I', table_name), 'update')
      or has_table_privilege('anon', format('elepem_core.%I', table_name), 'delete')
      or has_table_privilege('authenticated', format('elepem_core.%I', table_name), 'select')
      or has_table_privilege('authenticated', format('elepem_core.%I', table_name), 'insert')
      or has_table_privilege('authenticated', format('elepem_core.%I', table_name), 'update')
      or has_table_privilege('authenticated', format('elepem_core.%I', table_name), 'delete')
    then
      raise exception 'Browser role has a direct privilege on %', table_name;
    end if;
  end loop;

  if exists (
    select 1 from pg_policies where schemaname = 'elepem_core'
  ) then
    raise exception 'Normalized private tables must remain deny-by-default';
  end if;

  if has_schema_privilege('anon', 'elepem_core', 'usage')
    or has_schema_privilege('authenticated', 'elepem_core', 'usage')
  then
    raise exception 'Browser role has schema usage on elepem_core';
  end if;
end;
$$;

do $$
declare
  view_name text;
  security_options text[];
begin
  foreach view_name in array array[
    'facilities_current_internal',
    'facilities_public_approved',
    'residenciales_legacy_compat',
    'known_facilities_exclusion_view'
  ] loop
    if to_regclass(format('public.%I', view_name)) is null then
      raise exception 'Missing view: %', view_name;
    end if;

    select class.reloptions
      into security_options
    from pg_class as class
    join pg_namespace as namespace on namespace.oid = class.relnamespace
    where namespace.nspname = 'public' and class.relname = view_name;

    if not coalesce(security_options @> array['security_invoker=true'], false) then
      raise exception 'View % is not security_invoker', view_name;
    end if;

    if has_table_privilege('anon', format('public.%I', view_name), 'select')
      or has_table_privilege('authenticated', format('public.%I', view_name), 'select')
    then
      raise exception 'Browser role can read view % directly', view_name;
    end if;
  end loop;
end;
$$;

do $$
declare
  legacy_columns text[];
  compatibility_columns text[];
begin
  select array_agg(column_name order by ordinal_position)
    into legacy_columns
  from information_schema.columns
  where table_schema = 'public' and table_name = 'residenciales';

  select array_agg(column_name order by ordinal_position)
    into compatibility_columns
  from information_schema.columns
  where table_schema = 'public' and table_name = 'residenciales_legacy_compat';

  if legacy_columns is distinct from compatibility_columns then
    raise exception 'Legacy compatibility column order differs: % versus %',
      legacy_columns, compatibility_columns;
  end if;
end;
$$;

insert into elepem_core.facilities (
  facility_key,
  lifecycle_status,
  review_status,
  publication_status
) values (
  'TEST-FACILITY-001',
  'current',
  'verified',
  'private'
);

insert into elepem_core.facility_names (
  facility_id,
  name,
  normalized_name,
  name_type,
  is_preferred
)
select id, 'ELEPEM de prueba', 'elepem de prueba', 'canonical', true
from elepem_core.facilities
where facility_key = 'TEST-FACILITY-001';

insert into elepem_core.facility_addresses (
  facility_id,
  address_line,
  normalized_address,
  locality,
  department,
  address_type,
  is_current
)
select id, 'Calle de Prueba 100', 'calle de prueba 100', 'Montevideo', 'Montevideo', 'physical', true
from elepem_core.facilities
where facility_key = 'TEST-FACILITY-001';

insert into elepem_core.facility_geocodes (
  facility_id,
  address_id,
  provider,
  lat,
  lng,
  precision,
  precision_label,
  checked_at,
  is_current
)
select facility.id, address.id, 'manual', -34.90, -56.16, 'puerta', 'Fixture local', now(), true
from elepem_core.facilities as facility
join elepem_core.facility_addresses as address on address.facility_id = facility.id
where facility.facility_key = 'TEST-FACILITY-001';

-- A verified match may point only to the normalized facility during cutover.
-- This keeps the private review queue usable even when no legacy row exists.
insert into discovery_private.facility_candidates (
  candidate_key,
  status,
  normalized_name,
  normalized_department,
  evidence_tier,
  human_reviewed,
  reviewed_at,
  reviewed_by,
  review_note,
  resolved_facility_id
)
select
  'TEST-CANDIDATE-NORMALIZED-MATCH-001',
  'verified_match',
  'ELEPEM candidato normalizado',
  'Montevideo',
  'C',
  true,
  now(),
  'test-reviewer',
  'Fixture de vínculo normalizado sin identificador legado.',
  id
from elepem_core.facilities
where facility_key = 'TEST-FACILITY-001';

insert into discovery_private.facility_candidate_match_suggestions (
  candidate_id,
  residencial_id,
  facility_id,
  rank,
  score,
  components,
  generated_at
)
select
  candidate.id,
  null,
  facility.id,
  1,
  0.9900,
  '{"fixture":"normalized-only"}'::jsonb,
  now()
from discovery_private.facility_candidates as candidate
join elepem_core.facilities as facility
  on facility.facility_key = 'TEST-FACILITY-001'
where candidate.candidate_key = 'TEST-CANDIDATE-NORMALIZED-MATCH-001';

insert into discovery_private.facility_candidate_review_events (
  candidate_id,
  action,
  previous_status,
  new_status,
  previous_evidence_tier,
  new_evidence_tier,
  reviewer_identifier,
  review_note,
  candidate_before,
  candidate_after,
  matched_facility_id
)
select
  candidate.id,
  'verified_match',
  'needs_review',
  'verified_match',
  'C',
  'C',
  'test-reviewer',
  'Fixture de revisión con vínculo normalizado.',
  '{"status":"needs_review"}'::jsonb,
  '{"status":"verified_match"}'::jsonb,
  facility.id
from discovery_private.facility_candidates as candidate
join elepem_core.facilities as facility
  on facility.facility_key = 'TEST-FACILITY-001'
where candidate.candidate_key = 'TEST-CANDIDATE-NORMALIZED-MATCH-001';

do $$
begin
  begin
    update elepem_core.facilities
    set publication_status = 'approved'
    where facility_key = 'TEST-FACILITY-001';
    raise exception 'Expected publication without A/B review to fail';
  exception
    when check_violation then null;
  end;

  begin
    insert into elepem_core.facility_reviews (
      facility_id,
      review_type,
      outcome,
      evidence_tier,
      reviewer_identifier,
      review_note
    )
    select id, 'publication', 'approve_publication', 'C', 'test-reviewer', 'Invalid tier fixture'
    from elepem_core.facilities
    where facility_key = 'TEST-FACILITY-001';
    raise exception 'Expected tier C publication approval to fail';
  exception
    when check_violation then null;
  end;
end;
$$;

insert into elepem_core.facility_reviews (
  facility_id,
  review_type,
  outcome,
  evidence_tier,
  reviewer_identifier,
  review_note
)
select id, 'publication', 'approve_publication', 'A', 'test-reviewer', 'Official nominal fixture'
from elepem_core.facilities
where facility_key = 'TEST-FACILITY-001';

update elepem_core.facilities
set publication_status = 'approved'
where facility_key = 'TEST-FACILITY-001';

do $$
declare
  approved_count integer;
begin
  select count(*) into approved_count
  from public.facilities_public_approved
  where id = 'TEST-FACILITY-001';

  if approved_count <> 1 then
    raise exception 'Expected one approved public fixture, found %', approved_count;
  end if;

  begin
    update elepem_core.facility_reviews
    set review_note = 'Mutation must fail'
    where reviewer_identifier = 'test-reviewer';
    raise exception 'Expected append-only review mutation to fail';
  exception
    when sqlstate '55000' then null;
  end;
end;
$$;

select
  (select count(*) from pg_tables where schemaname = 'elepem_core') as normalized_tables,
  (select count(*) from pg_views where schemaname = 'public' and viewname in (
    'facilities_current_internal',
    'facilities_public_approved',
    'residenciales_legacy_compat',
    'known_facilities_exclusion_view'
  )) as normalized_views,
  (select count(*) from public.facilities_public_approved) as approved_fixture_rows;

rollback;
