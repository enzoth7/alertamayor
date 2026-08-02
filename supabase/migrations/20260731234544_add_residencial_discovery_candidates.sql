create table public.residencial_discovery_candidates (
  id text primary key check (id ~ '^RDC-[a-f0-9]{16}$'),
  sources text[] not null check (
    sources <@ array['openstreetmap', 'google_places', 'apify']::text[]
    and cardinality(sources) > 0
  ),
  origins jsonb not null check (jsonb_typeof(origins) = 'array'),
  google_place_ids text[] not null default '{}',
  name text check (name is null or char_length(name) between 1 and 240),
  department text check (
    department is null or char_length(department) between 1 and 100
  ),
  locality text check (locality is null or char_length(locality) between 1 and 160),
  address text check (address is null or char_length(address) between 1 and 400),
  phone text check (phone is null or char_length(phone) <= 120),
  website_url text check (website_url is null or char_length(website_url) <= 1000),
  lat double precision check (lat is null or lat between -90 and 90),
  lng double precision check (lng is null or lng between -180 and 180),
  operational_status text check (
    operational_status is null or char_length(operational_status) <= 80
  ),
  storage_policy text not null check (
    storage_policy in (
      'open_data',
      'google_place_id_only',
      'internal_contract_risk'
    )
  ),
  match_status text not null check (
    match_status in ('probable_match', 'possible_match', 'new_candidate')
  ),
  suggested_residencial_id text references public.residenciales(id)
    on update cascade on delete set null,
  confidence numeric(5, 4) not null check (confidence between 0 and 1),
  match_reasons text[] not null default '{}',
  alternative_matches jsonb not null default '[]'::jsonb check (
    jsonb_typeof(alternative_matches) = 'array'
  ),
  review_status text not null default 'pending' check (
    review_status in ('pending', 'matched', 'approved_new', 'rejected')
  ),
  reviewed_at timestamptz,
  reviewed_by text check (reviewed_by is null or char_length(reviewed_by) <= 160),
  review_notes text check (review_notes is null or char_length(review_notes) <= 4000),
  promoted_residencial_id text references public.residenciales(id)
    on update cascade on delete set null,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  run_metadata jsonb not null default '{}'::jsonb check (
    jsonb_typeof(run_metadata) = 'object'
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((lat is null) = (lng is null)),
  check (
    (review_status = 'matched' and suggested_residencial_id is not null)
    or review_status <> 'matched'
  )
);

create index residencial_discovery_candidates_review_idx
  on public.residencial_discovery_candidates (review_status, match_status);
create index residencial_discovery_candidates_department_idx
  on public.residencial_discovery_candidates (department);
create index residencial_discovery_candidates_sources_idx
  on public.residencial_discovery_candidates using gin (sources);
create index residencial_discovery_candidates_place_ids_idx
  on public.residencial_discovery_candidates using gin (google_place_ids);

alter table public.residencial_discovery_candidates enable row level security;
revoke all on table public.residencial_discovery_candidates from anon, authenticated;

comment on table public.residencial_discovery_candidates is
  'Cola privada y auditable de candidatos ELEPEM descubiertos antes de su eventual publicación como verificar.';
comment on column public.residencial_discovery_candidates.google_place_ids is
  'Identificadores de Google Places; no contiene otro contenido persistido de Places API.';
comment on column public.residencial_discovery_candidates.storage_policy is
  'Regla de persistencia aplicada según la fuente y sus términos/licencia.';
comment on column public.residencial_discovery_candidates.review_status is
  'Decisión humana obligatoria antes de vincular o promover un candidato.';
