-- Phase 1: private, auditable discovery workflow.
-- This migration deliberately does not alter public.residenciales and does not
-- create any public view, publication trigger, or browser-facing RLS policy.

create schema if not exists discovery_private;

revoke all on schema discovery_private from public, anon, authenticated, service_role;

create table if not exists discovery_private.facility_source_runs (
  id bigint generated always as identity primary key,
  run_key text not null unique
    check (char_length(run_key) between 1 and 200),
  source_type text not null
    check (source_type in (
      'official',
      'openstreetmap',
      'public_directory',
      'facility_website',
      'news',
      'social_public_url',
      'manual_referral',
      'other'
    )),
  source_url text not null
    check (char_length(source_url) <= 1000 and source_url ~* '^https?://'),
  source_license text
    check (source_license is null or char_length(source_license) <= 160),
  storage_policy text not null default 'normalized_only'
    check (storage_policy in (
      'reference_only',
      'normalized_only',
      'raw_metadata_permitted'
    )),
  status text not null default 'running'
    check (status in ('running', 'succeeded', 'failed', 'cancelled')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  observation_count integer not null default 0
    check (observation_count >= 0),
  error_summary text
    check (error_summary is null or char_length(error_summary) <= 2000),
  created_at timestamptz not null default now(),
  constraint facility_source_runs_id_source_type_key unique (id, source_type),
  constraint facility_source_runs_completion_check check (
    (status = 'running' and completed_at is null)
    or (status <> 'running' and completed_at is not null)
  ),
  constraint facility_source_runs_time_check check (
    completed_at is null or completed_at >= started_at
  )
);

create table if not exists discovery_private.facility_source_observations (
  id bigint generated always as identity primary key,
  run_id bigint not null,
  source_type text not null
    check (source_type in (
      'official',
      'openstreetmap',
      'public_directory',
      'facility_website',
      'news',
      'social_public_url',
      'manual_referral',
      'other'
    )),
  source_record_key text not null
    check (char_length(source_record_key) between 1 and 300),
  source_url text not null
    check (char_length(source_url) <= 1000 and source_url ~* '^https?://'),
  retrieved_at timestamptz not null,
  source_date date,
  source_license text
    check (source_license is null or char_length(source_license) <= 160),
  storage_policy text not null default 'normalized_only'
    check (storage_policy in (
      'reference_only',
      'normalized_only',
      'raw_metadata_permitted'
    )),
  normalized_name text
    check (normalized_name is null or char_length(normalized_name) between 1 and 300),
  normalized_department text
    check (
      normalized_department is null
      or char_length(normalized_department) between 1 and 100
    ),
  normalized_locality text
    check (normalized_locality is null or char_length(normalized_locality) between 1 and 160),
  normalized_address text
    check (normalized_address is null or char_length(normalized_address) between 1 and 500),
  lat double precision check (lat is null or lat between -90 and 90),
  lng double precision check (lng is null or lng between -180 and 180),
  human_note text
    check (human_note is null or char_length(human_note) <= 500),
  raw_metadata_storage_permitted boolean not null default false,
  raw_metadata jsonb,
  record_hash text not null
    check (record_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  constraint facility_source_observations_run_source_fkey
    foreign key (run_id, source_type)
    references discovery_private.facility_source_runs (id, source_type)
    on update cascade on delete restrict,
  constraint facility_source_observations_run_record_key
    unique (run_id, source_type, source_record_key),
  constraint facility_source_observations_version_key
    unique (source_type, source_record_key, record_hash),
  constraint facility_source_observations_coordinates_check check (
    (lat is null) = (lng is null)
  ),
  constraint facility_source_observations_raw_metadata_check check (
    raw_metadata is null
    or (
      raw_metadata_storage_permitted
      and storage_policy = 'raw_metadata_permitted'
      and jsonb_typeof(raw_metadata) = 'object'
      and octet_length(raw_metadata::text) <= 262144
    )
  ),
  constraint facility_source_observations_social_storage_check check (
    source_type <> 'social_public_url'
    or (
      storage_policy = 'reference_only'
      and not raw_metadata_storage_permitted
      and raw_metadata is null
      and normalized_name is null
      and normalized_department is null
      and normalized_locality is null
      and normalized_address is null
      and lat is null
      and lng is null
      and human_note is not null
    )
  )
);

create table if not exists discovery_private.facility_candidates (
  id bigint generated always as identity primary key,
  candidate_key text not null unique
    check (char_length(candidate_key) between 1 and 360),
  status text not null default 'discovered'
    check (status in (
      'discovered',
      'possible_match',
      'needs_review',
      'verified_new',
      'verified_match',
      'rejected',
      'duplicate',
      'closed'
    )),
  normalized_name text not null
    check (char_length(normalized_name) between 1 and 300),
  normalized_department text
    check (
      normalized_department is null
      or char_length(normalized_department) between 1 and 100
    ),
  normalized_locality text
    check (normalized_locality is null or char_length(normalized_locality) between 1 and 160),
  normalized_address text
    check (normalized_address is null or char_length(normalized_address) between 1 and 500),
  lat double precision check (lat is null or lat between -90 and 90),
  lng double precision check (lng is null or lng between -180 and 180),
  best_match_residencial_id text
    references public.residenciales (id)
    on update cascade on delete set null,
  best_match_score numeric(5, 4)
    check (best_match_score is null or best_match_score between 0 and 1),
  evidence_tier text not null default 'C'
    check (evidence_tier in ('A', 'B', 'C')),
  human_reviewed boolean not null default false,
  reviewed_at timestamptz,
  reviewed_by text
    check (reviewed_by is null or char_length(reviewed_by) between 1 and 200),
  review_note text
    check (review_note is null or char_length(review_note) <= 2000),
  public_eligible boolean not null default false,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint facility_candidates_coordinates_check check (
    (lat is null) = (lng is null)
  ),
  constraint facility_candidates_seen_time_check check (
    last_seen_at >= first_seen_at
  ),
  constraint facility_candidates_review_identity_check check (
    (
      human_reviewed
      and reviewed_at is not null
      and reviewed_by is not null
    )
    or (
      not human_reviewed
      and reviewed_at is null
      and reviewed_by is null
    )
  ),
  constraint facility_candidates_human_terminal_status_check check (
    status not in ('verified_new', 'verified_match', 'rejected', 'duplicate', 'closed')
    or human_reviewed
  ),
  constraint facility_candidates_verified_match_check check (
    status <> 'verified_match' or best_match_residencial_id is not null
  ),
  constraint facility_candidates_verified_new_check check (
    status <> 'verified_new' or best_match_residencial_id is null
  ),
  constraint facility_candidates_public_eligible_check check (
    not public_eligible
    or (
      human_reviewed
      and status in ('verified_new', 'verified_match')
      and evidence_tier in ('A', 'B')
      and reviewed_at is not null
      and reviewed_by is not null
    )
  )
);

create table if not exists discovery_private.facility_candidate_sources (
  candidate_id bigint not null
    references discovery_private.facility_candidates (id)
    on update cascade on delete cascade,
  observation_id bigint not null
    references discovery_private.facility_source_observations (id)
    on update cascade on delete restrict,
  evidence_role text not null default 'lead'
    check (evidence_role in (
      'lead',
      'evidence_a',
      'evidence_b',
      'context',
      'conflict',
      'duplicate'
    )),
  independence_key text
    check (independence_key is null or char_length(independence_key) between 1 and 200),
  link_method text not null default 'automated'
    check (link_method in ('automated', 'human')),
  linked_by text
    check (linked_by is null or char_length(linked_by) between 1 and 200),
  linked_at timestamptz not null default now(),
  primary key (candidate_id, observation_id),
  constraint facility_candidate_sources_evidence_b_check check (
    evidence_role <> 'evidence_b' or independence_key is not null
  ),
  constraint facility_candidate_sources_human_link_check check (
    link_method <> 'human' or linked_by is not null
  )
);

create table if not exists discovery_private.facility_external_ids (
  id bigint generated always as identity primary key,
  candidate_id bigint
    references discovery_private.facility_candidates (id)
    on update cascade on delete cascade,
  residencial_id text
    references public.residenciales (id)
    on update cascade on delete restrict,
  observation_id bigint
    references discovery_private.facility_source_observations (id)
    on update cascade on delete restrict,
  provider text not null
    check (provider in ('google_place', 'openstreetmap', 'ide_uy', 'official', 'other')),
  external_id text not null
    check (char_length(external_id) between 1 and 300),
  external_url text
    check (
      external_url is null
      or (char_length(external_url) <= 1000 and external_url ~* '^https?://')
    ),
  link_method text not null
    check (link_method in ('manual', 'official_import', 'source_observation')),
  linked_by text not null
    check (char_length(linked_by) between 1 and 200),
  linked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint facility_external_ids_provider_id_key unique (provider, external_id),
  constraint facility_external_ids_owner_check check (
    (candidate_id is not null)::integer + (residencial_id is not null)::integer = 1
  ),
  constraint facility_external_ids_observation_link_check check (
    link_method <> 'source_observation' or observation_id is not null
  ),
  constraint facility_external_ids_google_manual_check check (
    provider <> 'google_place'
    or (
      link_method = 'manual'
      and external_url is not null
      and external_url ~* '^https://((www\.)?google\.[a-z.]+/maps|maps\.google\.[a-z.]+/)'
      and observation_id is null
    )
  )
);

create index if not exists facility_source_runs_status_started_idx
  on discovery_private.facility_source_runs (status, started_at desc);
create index if not exists facility_source_runs_type_started_idx
  on discovery_private.facility_source_runs (source_type, started_at desc);

create index if not exists facility_source_observations_retrieved_idx
  on discovery_private.facility_source_observations (retrieved_at desc);
create index if not exists facility_source_observations_source_date_idx
  on discovery_private.facility_source_observations (source_type, source_date desc)
  where source_date is not null;

create index if not exists facility_candidates_queue_idx
  on discovery_private.facility_candidates (status, updated_at desc);
create index if not exists facility_candidates_department_status_idx
  on discovery_private.facility_candidates (normalized_department, status);
create index if not exists facility_candidates_match_idx
  on discovery_private.facility_candidates (best_match_residencial_id)
  where best_match_residencial_id is not null;
create index if not exists facility_candidates_public_eligible_idx
  on discovery_private.facility_candidates (updated_at desc)
  where public_eligible;

create index if not exists facility_candidate_sources_observation_idx
  on discovery_private.facility_candidate_sources (observation_id);
create index if not exists facility_candidate_sources_evidence_idx
  on discovery_private.facility_candidate_sources (candidate_id, evidence_role, independence_key)
  where evidence_role in ('evidence_a', 'evidence_b');

create index if not exists facility_external_ids_candidate_idx
  on discovery_private.facility_external_ids (candidate_id)
  where candidate_id is not null;
create index if not exists facility_external_ids_residencial_idx
  on discovery_private.facility_external_ids (residencial_id)
  where residencial_id is not null;
create index if not exists facility_external_ids_observation_idx
  on discovery_private.facility_external_ids (observation_id)
  where observation_id is not null;

create or replace function discovery_private.enforce_candidate_public_eligibility()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  evidence_is_valid boolean := false;
begin
  if not new.public_eligible then
    return new;
  end if;

  if new.evidence_tier = 'A' then
    select exists (
      select 1
      from discovery_private.facility_candidate_sources as candidate_source
      join discovery_private.facility_source_observations as observation
        on observation.id = candidate_source.observation_id
      where candidate_source.candidate_id = new.id
        and candidate_source.evidence_role = 'evidence_a'
        and observation.source_type = 'official'
        and observation.normalized_name is not null
    ) into evidence_is_valid;
  elsif new.evidence_tier = 'B' then
    select count(distinct candidate_source.independence_key) >= 2
      into evidence_is_valid
    from discovery_private.facility_candidate_sources as candidate_source
    join discovery_private.facility_source_observations as observation
      on observation.id = candidate_source.observation_id
    where candidate_source.candidate_id = new.id
      and candidate_source.evidence_role = 'evidence_b'
      and candidate_source.independence_key is not null
      and observation.source_type <> 'social_public_url';
  end if;

  if not evidence_is_valid then
    raise exception using
      errcode = '23514',
      message = 'public_eligible requires linked evidence supporting tier A or B';
  end if;

  return new;
end;
$$;

revoke execute on function discovery_private.enforce_candidate_public_eligibility()
  from public, anon, authenticated, service_role;

drop trigger if exists facility_candidates_public_eligibility_guard
  on discovery_private.facility_candidates;
create trigger facility_candidates_public_eligibility_guard
before insert or update of public_eligible, evidence_tier, status, human_reviewed,
  reviewed_at, reviewed_by
on discovery_private.facility_candidates
for each row
execute function discovery_private.enforce_candidate_public_eligibility();

alter table discovery_private.facility_source_runs enable row level security;
alter table discovery_private.facility_source_runs force row level security;
alter table discovery_private.facility_source_observations enable row level security;
alter table discovery_private.facility_source_observations force row level security;
alter table discovery_private.facility_candidates enable row level security;
alter table discovery_private.facility_candidates force row level security;
alter table discovery_private.facility_candidate_sources enable row level security;
alter table discovery_private.facility_candidate_sources force row level security;
alter table discovery_private.facility_external_ids enable row level security;
alter table discovery_private.facility_external_ids force row level security;

revoke all on table
  discovery_private.facility_source_runs,
  discovery_private.facility_source_observations,
  discovery_private.facility_candidates,
  discovery_private.facility_candidate_sources,
  discovery_private.facility_external_ids
from public, anon, authenticated;

revoke all on table
  discovery_private.facility_source_runs,
  discovery_private.facility_source_observations,
  discovery_private.facility_candidates,
  discovery_private.facility_candidate_sources,
  discovery_private.facility_external_ids
from service_role;

revoke all on sequence
  discovery_private.facility_source_runs_id_seq,
  discovery_private.facility_source_observations_id_seq,
  discovery_private.facility_candidates_id_seq,
  discovery_private.facility_external_ids_id_seq
from public, anon, authenticated;

revoke all on sequence
  discovery_private.facility_source_runs_id_seq,
  discovery_private.facility_source_observations_id_seq,
  discovery_private.facility_candidates_id_seq,
  discovery_private.facility_external_ids_id_seq
from service_role;

grant usage on schema discovery_private to service_role;
grant select, insert
  on discovery_private.facility_source_runs
  to service_role;
grant update (status, completed_at, observation_count, error_summary)
  on discovery_private.facility_source_runs
  to service_role;
grant select, insert
  on discovery_private.facility_source_observations,
     discovery_private.facility_candidate_sources,
     discovery_private.facility_external_ids
  to service_role;
grant select, insert
  on discovery_private.facility_candidates
  to service_role;
grant update (
  status,
  normalized_name,
  normalized_department,
  normalized_locality,
  normalized_address,
  lat,
  lng,
  best_match_residencial_id,
  best_match_score,
  evidence_tier,
  human_reviewed,
  reviewed_at,
  reviewed_by,
  review_note,
  public_eligible,
  last_seen_at,
  updated_at
)
on discovery_private.facility_candidates
to service_role;
grant usage, select on sequence
  discovery_private.facility_source_runs_id_seq,
  discovery_private.facility_source_observations_id_seq,
  discovery_private.facility_candidates_id_seq,
  discovery_private.facility_external_ids_id_seq
to service_role;

comment on schema discovery_private is
  'Non-exposed schema for the private ELEPEM discovery and human-review workflow.';
comment on table discovery_private.facility_source_runs is
  'Auditable executions of approved discovery sources. No browser access.';
comment on table discovery_private.facility_source_observations is
  'Versioned source observations with normalized fields, provenance, retrieval date and record hash.';
comment on column discovery_private.facility_source_observations.raw_metadata is
  'Optional source metadata only when storage_policy and a human/legal assessment permit storage; must exclude prohibited personal or platform content.';
comment on column discovery_private.facility_source_observations.human_note is
  'Brief human observation; for Instagram/Facebook only URL, retrieval time and this note may be retained.';
comment on table discovery_private.facility_candidates is
  'Private candidate queue. public_eligible is not publication and never writes to public.residenciales.';
comment on column discovery_private.facility_candidates.public_eligible is
  'May be true only after human review, verified status and linked A/B evidence; promotion is a separate future action.';
comment on table discovery_private.facility_candidate_sources is
  'Traceability links between candidates and source observations.';
comment on column discovery_private.facility_candidate_sources.independence_key is
  'Stable organization/domain key used to demonstrate independence between tier-B sources.';
comment on table discovery_private.facility_external_ids is
  'External identifiers only. Google place IDs must be linked manually with an external Maps URL.';
