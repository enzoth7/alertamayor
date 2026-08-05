-- Correct eight legacy street-centroid geocodes that were rendered over water.
-- Source files remain immutable. Every change is guarded by the legacy ID and
-- previous coordinates, versioned in elepem_core, and copied to audit_log.

begin;

create temporary table _facility_geocode_corrections (
  legacy_id text primary key,
  old_lat double precision not null,
  old_lng double precision not null,
  new_lat double precision not null,
  new_lng double precision not null,
  precision text not null,
  precision_label text not null,
  provider text not null,
  query_original text not null,
  provider_response jsonb not null,
  new_address text,
  new_normalized_address text,
  new_locality text
) on commit drop;

insert into _facility_geocode_corrections (
  legacy_id, old_lat, old_lng, new_lat, new_lng, precision,
  precision_label, provider, query_original, provider_response,
  new_address, new_normalized_address, new_locality
) values
  (
    'ELP-0210', -34.9254424, -54.9695403,
    -34.9136799, -54.9683058, 'calle',
    'Ubicación aproximada sobre calle Cuba; sin número', 'manual',
    'Cuba S/N, Las Delicias, Maldonado',
    '{"source":"OpenStreetMap/Nominatim","osm_type":"way","osm_id":181384749,"checked_at":"2026-08-04","note":"Centro de un tramo de la calle Cuba; no representa una puerta exacta."}'::jsonb,
    null, null, null
  ),
  (
    'ELP-0224', -34.949791, -54.9429268,
    -34.9332672, -54.9501289, 'referencial',
    'Intersección Av. Francia y Rosario', 'manual',
    'Av. Francia casi Rosario, Punta del Este, Maldonado',
    '{"source":"OpenStreetMap","osm_node_id":1167220004,"checked_at":"2026-08-04","note":"Intersección coherente con la referencia pública Av. Francia casi Rosario."}'::jsonb,
    null, null, null
  ),
  (
    'ELP-0234', -34.9261869, -54.9720865,
    -34.924297714278204, -54.961185200423856, 'calle',
    'Ubicación aproximada sobre 6 de Julio de 1784', 'ide_uy',
    '6 de Julio de 1784, Maldonado, Maldonado',
    '{"source":"IDE Uruguay","checked_at":"2026-08-04","note":"Punto sobre la calle correcta; la fuente no aporta una puerta inequívoca."}'::jsonb,
    null, null, null
  ),
  (
    'ELP-0238', -34.8819151, -55.0583839,
    -34.910046845316636, -54.96027571897162, 'puerta',
    'Puerta 870 verificada con IDE Uruguay', 'ide_uy',
    'Rafael Pérez del Puerto 870, Maldonado, Maldonado',
    '{"source":"IDE Uruguay","checked_at":"2026-08-04","matched_street":"Rafael Pérez del Puerto","matched_door":"870"}'::jsonb,
    'Rafael Pérez del Puerto 870', 'rafael perez del puerto 870', 'Maldonado'
  ),
  (
    'ELP-0245', -34.9342877, -54.9604042,
    -34.9276295, -54.9495584, 'referencial',
    'Intersección República Argentina y Fort Wayne', 'manual',
    'Av. República Argentina y Fort Wayne, Maldonado',
    '{"source":"OpenStreetMap","checked_at":"2026-08-04","note":"Intersección de las dos calles indicadas en la fuente oficial."}'::jsonb,
    null, null, null
  ),
  (
    'ELP-0254', -34.9137332, -55.0244861,
    -34.9193466, -54.9642505, 'referencial',
    'Intersección Costa Rica y Nicaragua', 'manual',
    'Costa Rica y Nicaragua, Punta del Este, Maldonado',
    '{"source":"OpenStreetMap","checked_at":"2026-08-04","note":"Intersección de las dos calles indicadas en la fuente oficial."}'::jsonb,
    null, null, null
  ),
  (
    'ELP-0599', -34.9194975, -56.1770866,
    -34.90406192990198, -56.17719703280619, 'puerta',
    'Puerta 1425 verificada con IDE Uruguay', 'ide_uy',
    'José Arismendi 1425, Montevideo, Montevideo',
    '{"source":"IDE Uruguay","checked_at":"2026-08-04","matched_street":"José Arismendi","matched_door":"1425","note":"La dirección pública independiente 1425 resuelve la inconsistencia del valor histórico 1025."}'::jsonb,
    'José Arismendi 1425', 'jose arismendi 1425', 'Montevideo'
  ),
  (
    'ELP-0626', -34.8461581, -56.4066952,
    -34.88261129305755, -56.172854896652375, 'puerta',
    'Puerta 2431 verificada con IDE Uruguay', 'ide_uy',
    'Joaquín Requena 2431, Montevideo, Montevideo',
    '{"source":"IDE Uruguay","checked_at":"2026-08-04","matched_street":"Doctor Joaquín Requena","matched_door":"2431","note":"Corrige la interpretación errónea de Camino J. Requena."}'::jsonb,
    'Joaquín Requena 2431', 'joaquin requena 2431', 'Montevideo'
  );

do $$
declare
  matched_count integer;
  mapped_count integer;
begin
  select count(*)
  into matched_count
  from public.residenciales as residencial
  join _facility_geocode_corrections as correction
    on correction.legacy_id = residencial.id
   and residencial.lat = correction.old_lat
   and residencial.lng = correction.old_lng;

  if matched_count <> 8 then
    raise exception 'Expected 8 unchanged legacy geocodes, found %', matched_count;
  end if;

  select count(*)
  into mapped_count
  from _facility_geocode_corrections as correction
  join elepem_core.legacy_facility_map as mapping
    on mapping.legacy_residencial_id = correction.legacy_id
   and mapping.mapping_status = 'mapped'
   and mapping.facility_id is not null;

  if mapped_count <> 8 then
    raise exception 'Expected 8 mapped normalized facilities, found %', mapped_count;
  end if;
end;
$$;

-- Preserve superseded normalized addresses instead of overwriting evidence.
update elepem_core.facility_addresses as address
set is_current = false,
    valid_to = current_date
from elepem_core.legacy_facility_map as mapping
join _facility_geocode_corrections as correction
  on correction.legacy_id = mapping.legacy_residencial_id
where address.facility_id = mapping.facility_id
  and address.is_current
  and correction.new_address is not null;

insert into elepem_core.facility_addresses (
  facility_id, address_line, normalized_address, locality, department,
  address_type, valid_from, is_current, observation_id
)
select
  mapping.facility_id,
  correction.new_address,
  correction.new_normalized_address,
  correction.new_locality,
  residencial.department,
  'physical',
  current_date,
  true,
  previous_address.observation_id
from _facility_geocode_corrections as correction
join public.residenciales as residencial
  on residencial.id = correction.legacy_id
join elepem_core.legacy_facility_map as mapping
  on mapping.legacy_residencial_id = correction.legacy_id
join lateral (
  select address.observation_id
  from elepem_core.facility_addresses as address
  where address.facility_id = mapping.facility_id
  order by address.created_at desc, address.id desc
  limit 1
) as previous_address on true
where correction.new_address is not null;

-- Version geocodes: old records remain available for audit but cease to be current.
update elepem_core.facility_geocodes as geocode
set is_current = false
from elepem_core.legacy_facility_map as mapping
join _facility_geocode_corrections as correction
  on correction.legacy_id = mapping.legacy_residencial_id
where geocode.facility_id = mapping.facility_id
  and geocode.is_current;

insert into elepem_core.facility_geocodes (
  facility_id, address_id, provider, query_original, query_normalized,
  lat, lng, precision, precision_label, confidence, provider_response,
  manually_corrected, reviewed_by, checked_at, is_current, observation_id
)
select
  mapping.facility_id,
  address.id,
  correction.provider,
  correction.query_original,
  lower(correction.query_original),
  correction.new_lat,
  correction.new_lng,
  correction.precision,
  correction.precision_label,
  case correction.precision
    when 'puerta' then 1.0000
    when 'referencial' then 0.9000
    else 0.7000
  end,
  correction.provider_response,
  true,
  'project_owner',
  '2026-08-04T21:15:00-03:00'::timestamptz,
  true,
  address.observation_id
from _facility_geocode_corrections as correction
join elepem_core.legacy_facility_map as mapping
  on mapping.legacy_residencial_id = correction.legacy_id
join elepem_core.facility_addresses as address
  on address.facility_id = mapping.facility_id
 and address.is_current;

insert into elepem_core.audit_log (
  entity_type, entity_key, action, actor_identifier,
  before_state, after_state, request_id
)
select
  'facility_geocode',
  correction.legacy_id,
  'correct_offshore_geocode',
  'codex:project_owner_instruction',
  jsonb_build_object(
    'lat', correction.old_lat,
    'lng', correction.old_lng,
    'address', residencial.address,
    'locality', residencial.locality,
    'precision', residencial.precision,
    'precision_label', residencial.precision_label
  ),
  jsonb_build_object(
    'lat', correction.new_lat,
    'lng', correction.new_lng,
    'address', coalesce(correction.new_address, residencial.address),
    'locality', coalesce(correction.new_locality, residencial.locality),
    'precision', correction.precision,
    'precision_label', correction.precision_label,
    'provider', correction.provider
  ),
  'correct-offshore-geocodes-2026-08-04'
from _facility_geocode_corrections as correction
join public.residenciales as residencial
  on residencial.id = correction.legacy_id;

update public.residenciales as residencial
set lat = correction.new_lat,
    lng = correction.new_lng,
    precision = correction.precision,
    precision_label = correction.precision_label,
    address = coalesce(correction.new_address, residencial.address),
    locality = coalesce(correction.new_locality, residencial.locality),
    updated_at = now()
from _facility_geocode_corrections as correction
where residencial.id = correction.legacy_id
  and residencial.lat = correction.old_lat
  and residencial.lng = correction.old_lng;

commit;
