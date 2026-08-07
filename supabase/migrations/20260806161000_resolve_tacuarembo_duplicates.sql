-- Resolve only the duplicate identities explicitly confirmed by the project owner.

begin;

do $$
declare
  source_count integer;
  target_count integer;
  violetas_count integer;
begin
  select count(*) into source_count
  from elepem_core.facilities as facility
  join elepem_core.legacy_facility_map as mapping on mapping.facility_id = facility.id
  where facility.id = 555
    and facility.lifecycle_status = 'current'
    and mapping.legacy_residencial_id = 'ELP-0798';

  select count(*) into target_count
  from elepem_core.facilities as facility
  join elepem_core.legacy_facility_map as mapping on mapping.facility_id = facility.id
  where facility.id = 565
    and facility.lifecycle_status = 'current'
    and mapping.legacy_residencial_id = 'ELP-0808';

  select count(*) into violetas_count
  from discovery_private.facility_candidates
  where candidate_key = 'tacuarembo:casa-las-violetas:bulevar-artigas-152'
    and status = 'needs_review';

  if source_count <> 1 or target_count <> 1 or violetas_count <> 1 then
    raise exception 'Duplicate resolution guard failed: source %, target %, violetas %',
      source_count, target_count, violetas_count;
  end if;
end;
$$;

insert into elepem_core.facility_names (
  facility_id, name, normalized_name, name_type, valid_from,
  is_preferred, observation_id
)
select
  565,
  'Fantasia Maricel',
  'fantasia maricel',
  'alias',
  current_date,
  false,
  source_name.observation_id
from elepem_core.facility_names as source_name
where source_name.facility_id = 555
  and source_name.is_preferred
order by source_name.id desc
limit 1
on conflict do nothing;

update elepem_core.facilities
set lifecycle_status = 'merged',
    review_status = 'verified',
    publication_status = 'withdrawn',
    merged_into_facility_id = 565,
    updated_at = now()
where id = 555
  and lifecycle_status = 'current';

update discovery_private.facility_candidates
set status = 'duplicate',
    best_match_residencial_id = 'ELP-0806',
    resolved_facility_id = 563,
    human_reviewed = true,
    reviewed_at = '2026-08-06T16:00:00Z'::timestamptz,
    reviewed_by = 'project_owner',
    review_note = 'Duplicado confirmado de Residencial Las Violetas; conservar una sola entidad canónica.',
    public_eligible = false,
    updated_at = now()
where candidate_key = 'tacuarembo:casa-las-violetas:bulevar-artigas-152'
  and status = 'needs_review';

insert into elepem_core.audit_log (
  entity_type, entity_key, action, actor_identifier,
  before_state, after_state, request_id
) values
  (
    'facility',
    'FAC-LEGACY-ELP-0798-D1A39FAB9475B3D5',
    'merge_duplicate_facility',
    'codex:project_owner_instruction',
    '{"facility_id":555,"legacy_id":"ELP-0798","lifecycle_status":"current"}'::jsonb,
    '{"facility_id":555,"lifecycle_status":"merged","merged_into_facility_id":565,"canonical_legacy_id":"ELP-0808"}'::jsonb,
    'merge-fantasia-maricel-into-residencial-maricel-2026-08-06'
  ),
  (
    'facility_candidate',
    'tacuarembo:casa-las-violetas:bulevar-artigas-152',
    'mark_duplicate',
    'codex:project_owner_instruction',
    '{"status":"needs_review"}'::jsonb,
    '{"status":"duplicate","resolved_facility_id":563,"best_match_residencial_id":"ELP-0806"}'::jsonb,
    'resolve-casa-las-violetas-duplicate-2026-08-06'
  );

commit;
