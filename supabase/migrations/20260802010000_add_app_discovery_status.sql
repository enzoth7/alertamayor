alter table public.residenciales
  drop constraint residenciales_status_group_check;

alter table public.residenciales
  add constraint residenciales_status_group_check check (
    status_group in ('habilitado', 'registro', 'verificar', 'app')
  );

comment on column public.residenciales.status_group is
  'Categoría visual principal: habilitado, registro, verificar o app (hallazgo digital sin verificación administrativa).';
