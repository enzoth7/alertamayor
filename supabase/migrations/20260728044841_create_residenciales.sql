create table public.residenciales (
  id text primary key,
  name text not null check (char_length(name) between 1 and 200),
  department text not null check (char_length(department) between 1 and 100),
  locality text not null check (char_length(locality) between 1 and 120),
  address text not null check (char_length(address) between 1 and 300),
  places integer check (places is null or places >= 0),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  precision text not null check (precision in ('puerta', 'calle', 'referencial')),
  precision_label text not null check (char_length(precision_label) between 1 and 160),
  status_group text not null check (status_group in ('habilitado', 'registro', 'verificar')),
  status_stage text not null check (char_length(status_stage) between 1 and 120),
  status_short text not null check (char_length(status_short) between 1 and 200),
  source_label text not null check (char_length(source_label) between 1 and 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index residenciales_department_idx on public.residenciales (department);
create index residenciales_status_group_idx on public.residenciales (status_group);
create index residenciales_department_status_idx on public.residenciales (department, status_group);

alter table public.residenciales enable row level security;
revoke all on table public.residenciales from anon, authenticated;

comment on table public.residenciales is
  'Registro de residenciales/ELEPEM mostrado por la aplicación.';
comment on column public.residenciales.id is
  'Identificador estable proveniente de la fuente de datos original.';
