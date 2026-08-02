-- Private review queue support. Does not expose or modify public.residenciales.

create table if not exists discovery_private.facility_candidate_match_suggestions (
  candidate_id bigint not null
    references discovery_private.facility_candidates (id)
    on update cascade on delete cascade,
  residencial_id text not null
    references public.residenciales (id)
    on update cascade on delete restrict,
  rank smallint not null check (rank between 1 and 3),
  score numeric(5, 4) not null check (score between 0 and 1),
  components jsonb not null
    check (
      jsonb_typeof(components) = 'object'
      and octet_length(components::text) <= 16384
    ),
  generated_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (candidate_id, rank),
  constraint facility_candidate_match_suggestions_candidate_residencial_key
    unique (candidate_id, residencial_id)
);

create index if not exists facility_candidate_match_suggestions_residencial_idx
  on discovery_private.facility_candidate_match_suggestions (residencial_id);

create table if not exists discovery_private.facility_candidate_review_events (
  id bigint generated always as identity primary key,
  candidate_id bigint not null
    references discovery_private.facility_candidates (id)
    on update cascade on delete restrict,
  action text not null
    check (action in (
      'verified_new',
      'verified_match',
      'duplicate',
      'rejected',
      'closed',
      'needs_more_evidence'
    )),
  previous_status text not null,
  new_status text not null,
  previous_evidence_tier text not null check (previous_evidence_tier in ('A', 'B', 'C')),
  new_evidence_tier text not null check (new_evidence_tier in ('A', 'B', 'C')),
  matched_residencial_id text
    references public.residenciales (id)
    on update cascade on delete restrict,
  reviewer_identifier text not null
    check (char_length(reviewer_identifier) between 1 and 200),
  review_note text not null
    check (char_length(review_note) between 3 and 2000),
  corrections jsonb not null default '{}'::jsonb
    check (
      jsonb_typeof(corrections) = 'object'
      and octet_length(corrections::text) <= 16384
    ),
  candidate_before jsonb not null
    check (
      jsonb_typeof(candidate_before) = 'object'
      and octet_length(candidate_before::text) <= 32768
    ),
  candidate_after jsonb not null
    check (
      jsonb_typeof(candidate_after) = 'object'
      and octet_length(candidate_after::text) <= 32768
    ),
  created_at timestamptz not null default now()
);

create index if not exists facility_candidate_review_events_candidate_created_idx
  on discovery_private.facility_candidate_review_events (candidate_id, created_at desc);
create index if not exists facility_candidate_review_events_reviewer_created_idx
  on discovery_private.facility_candidate_review_events (reviewer_identifier, created_at desc);

alter table discovery_private.facility_candidate_match_suggestions enable row level security;
alter table discovery_private.facility_candidate_match_suggestions force row level security;
alter table discovery_private.facility_candidate_review_events enable row level security;
alter table discovery_private.facility_candidate_review_events force row level security;

revoke all on table
  discovery_private.facility_candidate_match_suggestions,
  discovery_private.facility_candidate_review_events
from public, anon, authenticated, service_role;

revoke all on sequence
  discovery_private.facility_candidate_review_events_id_seq
from public, anon, authenticated, service_role;

comment on table discovery_private.facility_candidate_match_suggestions is
  'Private, explainable top-three existing-facility suggestions for human candidate review.';
comment on table discovery_private.facility_candidate_review_events is
  'Append-only audit trail of authenticated human review decisions and corrections.';
comment on column discovery_private.facility_candidate_review_events.candidate_before is
  'Immutable snapshot of the private candidate immediately before the reviewed change.';
comment on column discovery_private.facility_candidate_review_events.candidate_after is
  'Immutable snapshot of the private candidate immediately after the reviewed change.';
