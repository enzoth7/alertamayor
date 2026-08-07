-- Correct ELP-0001 from an erroneous Quarai geocode to the manually reviewed
-- location supplied by the project owner in Paraje Cuareim, Bella Union.

begin;

do $$
declare
  legacy_count integer;
  mapped_count integer;
begin
  select count(*) into legacy_count
  from public.residenciales
  where id = 'ELP-0001'
    and lat = -30.379497
    and lng = -56.4646216;

  if legacy_count <> 1 then
    raise exception 'Expected unchanged ELP-0001 Quarai geocode, found %', legacy_count;
  end if;

  select count(*) into mapped_count
  from elepem_core.legacy_facility_map
  where legacy_residencial_id = 'ELP-0001'
    and mapping_status = 'mapped'
    and facility_id is not null;

  if mapped_count <> 1 then
    raise exception 'Expected one normalized mapping for ELP-0001, found %', mapped_count;
  end if;
end;
$$;

update elepem_core.facility_addresses as address
set is_current = false,
    valid_to = current_date
from elepem_core.legacy_facility_map as mapping
where mapping.legacy_residencial_id = 'ELP-0001'
  and address.facility_id = mapping.facility_id
  and address.is_current;

insert into elepem_core.facility_addresses (
  facility_id, address_line, normalized_address, locality, department,
  address_type, valid_from, is_current, observation_id
)
select
  mapping.facility_id,
  'Paraje Cuareim, Calle 10 s/n',
  'paraje cuareim 10 sn',
  'Bella Unión',
  'Artigas',
  'physical',
  current_date,
  true,
  previous_address.observation_id
from elepem_core.legacy_facility_map as mapping
join lateral (
  select address.observation_id
  from elepem_core.facility_addresses as address
  where address.facility_id = mapping.facility_id
  order by address.created_at desc, address.id desc
  limit 1
) as previous_address on true
where mapping.legacy_residencial_id = 'ELP-0001';

update elepem_core.facility_geocodes as geocode
set is_current = false
from elepem_core.legacy_facility_map as mapping
where mapping.legacy_residencial_id = 'ELP-0001'
  and geocode.facility_id = mapping.facility_id
  and geocode.is_current;

insert into elepem_core.facility_geocodes (
  facility_id, address_id, provider, query_original, query_normalized,
  lat, lng, precision, precision_label, confidence, provider_response,
  manually_corrected, reviewed_by, checked_at, is_current, observation_id
)
select
  mapping.facility_id,
  address.id,
  'manual',
  'Paraje Cuareim, Calle 10 s/n, Bella Unión, Artigas',
  'paraje cuareim 10 sn bella union artigas',
  -30.22471656303918,
  -57.56888600833107,
  'referencial',
  'Ubicación manual en Paraje Cuareim aportada por la persona responsable del proyecto',
  1.0000,
  '{"source":"project_owner","checked_at":"2026-08-06","note":"Corrige el pin erróneo ubicado en Quaraí, Brasil."}'::jsonb,
  true,
  'project_owner',
  '2026-08-06T13:00:00-03:00'::timestamptz,
  true,
  address.observation_id
from elepem_core.legacy_facility_map as mapping
join elepem_core.facility_addresses as address
  on address.facility_id = mapping.facility_id
 and address.is_current
where mapping.legacy_residencial_id = 'ELP-0001';

insert into elepem_core.audit_log (
  entity_type, entity_key, action, actor_identifier,
  before_state, after_state, request_id
)
select
  'facility_geocode',
  'ELP-0001',
  'correct_cross_border_geocode',
  'codex:project_owner_instruction',
  jsonb_build_object(
    'lat', residencial.lat,
    'lng', residencial.lng,
    'address', residencial.address,
    'locality', residencial.locality
  ),
  jsonb_build_object(
    'lat', -30.22471656303918,
    'lng', -57.56888600833107,
    'address', 'Paraje Cuareim, Calle 10 s/n',
    'locality', 'Bella Unión',
    'provider', 'manual'
  ),
  'correct-elida-moreira-location-2026-08-06'
from public.residenciales as residencial
where residencial.id = 'ELP-0001';

update public.residenciales
set lat = -30.22471656303918,
    lng = -57.56888600833107,
    address = 'Paraje Cuareim, Calle 10 s/n',
    locality = 'Bella Unión',
    precision = 'referencial',
    precision_label = 'Ubicación manual en Paraje Cuareim aportada por la persona responsable del proyecto',
    updated_at = now()
where id = 'ELP-0001'
  and lat = -30.379497
  and lng = -56.4646216;

commit;
