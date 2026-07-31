alter table public.residenciales
  add column if not exists msp_final boolean not null default false,
  add column if not exists msp_registro_historico boolean not null default false,
  add column if not exists mides_social boolean not null default false,
  add column if not exists pacp boolean not null default false;

comment on column public.residenciales.msp_final is
  'Figura en el listado de habilitaciones finales MSP usado por la carga auditada.';
comment on column public.residenciales.msp_registro_historico is
  'Tiene al menos una emisión histórica de certificado de registro MSP en la fuente auditada.';
comment on column public.residenciales.mides_social is
  'Figura en una página nominal recuperada de Certificado Social MIDES.';
comment on column public.residenciales.pacp is
  'Figura en el registro público de proveedores PACP incorporado a la fuente auditada.';
