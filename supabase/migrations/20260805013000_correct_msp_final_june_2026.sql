begin;

do $$
declare
  current_final integer;
  affected_final integer;
begin
  select count(*) into current_final from public.residenciales where msp_final;
  select count(*) into affected_final
  from public.residenciales
  where id = any(array[
    'MSP24-014','MSP24-026','MSP24-028','MSP24-151',
    'MSP24-196','MSP24-203','MSP24-205'
  ]) and msp_final;
  if current_final <> 219 or affected_final <> 7 then
    raise exception 'Preflight MSP final inesperado: total %, afectados %', current_final, affected_final;
  end if;
end $$;

update public.residenciales
set msp_final = false,
    msp_registro_historico = false,
    mides_social = false,
    pacp = false,
    status_group = 'verificar',
    status_stage = 'Revisión requerida',
    status_short = 'A verificar · no figura en habilitados MSP junio 2026',
    updated_at = now()
where id = any(array['MSP24-014','MSP24-026']);

update public.residenciales
set msp_final = false,
    msp_registro_historico = true,
    status_group = 'registro',
    status_stage = 'Etapa 1 de 3',
    status_short = 'Registro MSP histórico · sin habilitación final junio 2026',
    updated_at = now()
where id = any(array[
  'MSP24-028','MSP24-151','MSP24-196','MSP24-203','MSP24-205'
]);

delete from elepem_core.facility_administrative_events event
using elepem_core.legacy_facility_map map
where map.facility_id = event.facility_id
  and map.legacy_residencial_id = any(array[
    'MSP24-014','MSP24-026','MSP24-028','MSP24-151',
    'MSP24-196','MSP24-203','MSP24-205'
  ])
  and event.authority = 'MSP'
  and event.administrative_stage = 'authorization_final';

do $$
declare
  final_count integer;
  total_count integer;
  remaining_events integer;
begin
  select count(*) into final_count from public.residenciales where msp_final;
  select count(*) into total_count from public.residenciales;
  select count(*) into remaining_events
  from elepem_core.facility_administrative_events event
  join elepem_core.legacy_facility_map map on map.facility_id = event.facility_id
  where map.legacy_residencial_id = any(array[
    'MSP24-014','MSP24-026','MSP24-028','MSP24-151',
    'MSP24-196','MSP24-203','MSP24-205'
  ]) and event.authority = 'MSP' and event.administrative_stage = 'authorization_final';
  if final_count <> 212 or total_count <> 801 or remaining_events <> 0 then
    raise exception 'Postcheck inesperado: final %, total %, eventos %', final_count, total_count, remaining_events;
  end if;
end $$;

commit;
