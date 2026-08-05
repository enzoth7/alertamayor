begin;

update public.residenciales
set msp_final = true,
    msp_registro_historico = false,
    mides_social = false,
    pacp = false,
    status_group = 'habilitado',
    status_stage = 'Etapa 3 de 3',
    status_short = 'Habilitación final MSP · corte julio 2024',
    updated_at = now()
where id = any(array[
  'MSP24-014','MSP24-026','MSP24-028','MSP24-151',
  'MSP24-196','MSP24-203','MSP24-205'
]);

insert into elepem_core.facility_administrative_events (
  facility_id, authority, administrative_stage, status_label, reference_code,
  effective_date, end_date, is_current, observation_id, recorded_at
)
select values_row.facility_id, 'MSP', 'authorization_final',
       'Habilitación final MSP', null, null, null, true,
       values_row.observation_id, '2026-08-04T21:56:10.744Z'::timestamptz
from (values
  (581::bigint,3424::bigint),(593,3436),(595,3438),(718,3561),
  (763,3606),(770,3613),(772,3615)
) as values_row(facility_id, observation_id)
where not exists (
  select 1 from elepem_core.facility_administrative_events existing
  where existing.facility_id = values_row.facility_id
    and existing.authority = 'MSP'
    and existing.administrative_stage = 'authorization_final'
    and existing.observation_id = values_row.observation_id
);

commit;
