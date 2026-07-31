alter table public.residenciales
  add column if not exists other_source boolean not null default false;

comment on column public.residenciales.other_source is
  'La fila conserva una fuente conocida fuera de las tres listas administrativas auditadas en ELEPEM v01.';
