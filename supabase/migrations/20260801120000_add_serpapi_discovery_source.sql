alter table public.residencial_discovery_candidates
  drop constraint residencial_discovery_candidates_sources_check;

alter table public.residencial_discovery_candidates
  add constraint residencial_discovery_candidates_sources_check check (
    sources <@ array[
      'openstreetmap',
      'google_places',
      'apify',
      'serpapi'
    ]::text[]
    and cardinality(sources) > 0
  );

comment on column public.residencial_discovery_candidates.sources is
  'Fuentes de descubrimiento permitidas; SerpApi y Apify se mantienen como evidencia interna por riesgo contractual.';
