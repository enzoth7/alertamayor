-- Correct the offshore legacy street centroid for El Es Mi Paz (Canelones).
-- The official address has no door number, so the selected point is explicitly
-- stored as the midpoint of Avenida Brasil between Rio Negro and Paysandu.

begin;

do $$
declare
  target_count integer;
begin
  select count(*)
  into target_count
  from public.residenciales as residencial
  join elepem_core.legacy_facility_map as mapping
    on mapping.legacy_residencial_id = residencial.id
   and mapping.mapping_status = 'mapped'
   and mapping.facility_id is not null
  where residencial.id = 'ELP-0015'
    and residencial.lat = -34.8216231
    and residencial.lng = -55.7433088;

  if target_count <> 1 then
    raise exception 'Expected unchanged mapped ELP-0015 geocode, found %', target_count;
  end if;
end;
$$;

update elepem_core.facility_geocodes as geocode
set is_current = false
from elepem_core.legacy_facility_map as mapping
where mapping.legacy_residencial_id = 'ELP-0015'
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
  'Av. Brasil entre Rio Negro y Paysandu S/N, Progreso, Canelones',
  'av brasil entre rio negro y paysandu s n progreso canelones',
  -34.6689494,
  -56.22037565,
  'calle',
  'Tramo de Av. Brasil entre Rio Negro y Paysandu; sin numero',
  0.8000,
  jsonb_build_object(
    'source', 'OpenStreetMap',
    'checked_at', '2026-08-04',
    'street_osm_way_id', 256395595,
    'rio_negro_intersection_node', 1535239939,
    'paysandu_intersection_node', 1535239949,
    'method', 'midpoint_between_verified_intersections',
    'note', 'La fuente oficial no aporta numero de puerta; no representa una puerta exacta.'
  ),
  true,
  'project_owner',
  '2026-08-04T21:30:00-03:00'::timestamptz,
  true,
  address.observation_id
from elepem_core.legacy_facility_map as mapping
join elepem_core.facility_addresses as address
  on address.facility_id = mapping.facility_id
 and address.is_current
where mapping.legacy_residencial_id = 'ELP-0015';

insert into elepem_core.audit_log (
  entity_type, entity_key, action, actor_identifier,
  before_state, after_state, request_id
)
select
  'facility_geocode',
  residencial.id,
  'correct_offshore_geocode',
  'codex:project_owner_instruction',
  jsonb_build_object(
    'lat', residencial.lat,
    'lng', residencial.lng,
    'address', residencial.address,
    'locality', residencial.locality,
    'precision', residencial.precision,
    'precision_label', residencial.precision_label
  ),
  jsonb_build_object(
    'lat', -34.6689494,
    'lng', -56.22037565,
    'address', residencial.address,
    'locality', residencial.locality,
    'precision', 'calle',
    'precision_label', 'Tramo de Av. Brasil entre Rio Negro y Paysandu; sin numero',
    'provider', 'manual'
  ),
  'correct-el-es-mi-paz-geocode-2026-08-04'
from public.residenciales as residencial
where residencial.id = 'ELP-0015';

update public.residenciales
set lat = -34.6689494,
    lng = -56.22037565,
    precision = 'calle',
    precision_label = 'Tramo de Av. Brasil entre Rio Negro y Paysandu; sin numero',
    updated_at = now()
where id = 'ELP-0015'
  and lat = -34.8216231
  and lng = -55.7433088;

commit;
