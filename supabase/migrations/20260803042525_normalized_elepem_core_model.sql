-- Step 4 draft: side-by-side normalized ELEPEM model.
-- Prepared only; it must not be applied until a non-production target is
-- explicitly confirmed and the Step 5 backfill has been approved.

begin;

create schema if not exists elepem_core;

revoke all on schema elepem_core from public, anon, authenticated, service_role;

create table if not exists elepem_core.source_catalog (
  id bigint generated always as identity primary key,
  source_key text not null unique
    check (char_length(source_key) between 1 and 200),
  display_name text not null
    check (char_length(display_name) between 1 and 240),
  source_type text not null
    check (source_type in (
      'official',
      'openstreetmap',
      'public_directory',
      'facility_website',
      'news',
      'social_public_url',
      'manual_referral',
      'legacy_app',
      'other'
    )),
  source_channel text not null
    check (source_channel in (
      'official_sources',
      'public_maps',
      'public_social_sources',
      'other_public_sources',
      'manual_editorial'
    )),
  base_url text
    check (
      base_url is null
      or (char_length(base_url) <= 1000 and base_url ~* '^https?://')
    ),
  authority_level text not null default 'lead'
    check (authority_level in ('official_nominal', 'independent_public', 'lead')),
  storage_policy text not null default 'normalized_only'
    check (storage_policy in ('reference_only', 'normalized_only', 'raw_metadata_permitted')),
  source_license text
    check (source_license is null or char_length(source_license) <= 160),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists elepem_core.organizations (
  id bigint generated always as identity primary key,
  organization_key text not null unique
    check (char_length(organization_key) between 1 and 240),
  legal_name text not null
    check (char_length(legal_name) between 1 and 300),
  organization_type text not null default 'unknown'
    check (organization_type in ('company', 'association', 'foundation', 'public_body', 'person_sole_trader', 'unknown')),
  lifecycle_status text not null default 'current'
    check (lifecycle_status in ('current', 'historical', 'inactive', 'unknown')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists elepem_core.facilities (
  id bigint generated always as identity primary key,
  facility_key text not null unique
    check (char_length(facility_key) between 1 and 240),
  lifecycle_status text not null default 'current'
    check (lifecycle_status in ('current', 'historical', 'closed', 'merged', 'unknown')),
  review_status text not null default 'unreviewed'
    check (review_status in ('unreviewed', 'needs_review', 'verified', 'rejected')),
  publication_status text not null default 'private'
    check (publication_status in ('private', 'eligible', 'approved', 'withdrawn')),
  merged_into_facility_id bigint
    references elepem_core.facilities (id)
    on update cascade on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint facilities_merge_check check (
    lifecycle_status = 'merged'
      or merged_into_facility_id is null
  ),
  constraint facilities_not_self_merged_check check (
    merged_into_facility_id is null or merged_into_facility_id <> id
  )
);

create table if not exists elepem_core.facility_operators (
  id bigint generated always as identity primary key,
  facility_id bigint not null
    references elepem_core.facilities (id)
    on update cascade on delete restrict,
  organization_id bigint not null
    references elepem_core.organizations (id)
    on update cascade on delete restrict,
  relationship_type text not null
    check (relationship_type in ('operator', 'owner', 'manager', 'license_holder', 'other')),
  valid_from date,
  valid_to date,
  observation_id bigint
    references discovery_private.facility_source_observations (id)
    on update cascade on delete restrict,
  created_at timestamptz not null default now(),
  constraint facility_operators_dates_check check (
    valid_to is null or valid_from is null or valid_to >= valid_from
  )
);

create table if not exists elepem_core.facility_names (
  id bigint generated always as identity primary key,
  facility_id bigint not null
    references elepem_core.facilities (id)
    on update cascade on delete restrict,
  name text not null check (char_length(name) between 1 and 300),
  normalized_name text not null
    check (char_length(normalized_name) between 1 and 300),
  name_type text not null
    check (name_type in ('canonical', 'observed', 'alias', 'historical', 'legal')),
  valid_from date,
  valid_to date,
  is_preferred boolean not null default false,
  observation_id bigint
    references discovery_private.facility_source_observations (id)
    on update cascade on delete restrict,
  created_at timestamptz not null default now(),
  constraint facility_names_dates_check check (
    valid_to is null or valid_from is null or valid_to >= valid_from
  ),
  constraint facility_names_preferred_check check (
    not is_preferred or (name_type = 'canonical' and valid_to is null)
  ),
  constraint facility_names_value_unique unique nulls not distinct (
    facility_id,
    name_type,
    normalized_name,
    valid_from
  )
);

create table if not exists elepem_core.facility_addresses (
  id bigint generated always as identity primary key,
  facility_id bigint not null
    references elepem_core.facilities (id)
    on update cascade on delete restrict,
  address_line text not null
    check (char_length(address_line) between 1 and 500),
  normalized_address text not null
    check (char_length(normalized_address) between 1 and 500),
  locality text not null
    check (char_length(locality) between 1 and 160),
  department text not null
    check (char_length(department) between 1 and 100),
  postal_code text
    check (postal_code is null or char_length(postal_code) <= 20),
  address_type text not null default 'physical'
    check (address_type in ('physical', 'postal', 'historical')),
  valid_from date,
  valid_to date,
  is_current boolean not null default true,
  observation_id bigint
    references discovery_private.facility_source_observations (id)
    on update cascade on delete restrict,
  created_at timestamptz not null default now(),
  constraint facility_addresses_dates_check check (
    valid_to is null or valid_from is null or valid_to >= valid_from
  ),
  constraint facility_addresses_current_check check (
    not is_current or valid_to is null
  ),
  constraint facility_addresses_value_unique unique nulls not distinct (
    facility_id,
    normalized_address,
    locality,
    department,
    valid_from
  )
);

create table if not exists elepem_core.facility_contacts (
  id bigint generated always as identity primary key,
  facility_id bigint not null
    references elepem_core.facilities (id)
    on update cascade on delete restrict,
  contact_type text not null
    check (contact_type in ('phone', 'email', 'website')),
  contact_value text not null
    check (char_length(contact_value) between 1 and 500),
  normalized_value text not null
    check (char_length(normalized_value) between 1 and 500),
  valid_from date,
  valid_to date,
  is_current boolean not null default true,
  observation_id bigint
    references discovery_private.facility_source_observations (id)
    on update cascade on delete restrict,
  created_at timestamptz not null default now(),
  constraint facility_contacts_dates_check check (
    valid_to is null or valid_from is null or valid_to >= valid_from
  ),
  constraint facility_contacts_current_check check (
    not is_current or valid_to is null
  ),
  constraint facility_contacts_value_unique unique nulls not distinct (
    facility_id,
    contact_type,
    normalized_value,
    valid_from
  )
);

create table if not exists elepem_core.facility_social_accounts (
  id bigint generated always as identity primary key,
  facility_id bigint not null
    references elepem_core.facilities (id)
    on update cascade on delete restrict,
  platform text not null
    check (platform in ('instagram', 'facebook', 'other')),
  public_url text not null
    check (char_length(public_url) <= 1000 and public_url ~* '^https?://'),
  checked_at timestamptz not null,
  human_note text not null
    check (char_length(human_note) between 1 and 500),
  valid_to date,
  observation_id bigint
    references discovery_private.facility_source_observations (id)
    on update cascade on delete restrict,
  created_at timestamptz not null default now(),
  constraint facility_social_accounts_value_unique unique (facility_id, platform, public_url)
);

create table if not exists elepem_core.facility_observation_links (
  facility_id bigint not null
    references elepem_core.facilities (id)
    on update cascade on delete restrict,
  observation_id bigint not null
    references discovery_private.facility_source_observations (id)
    on update cascade on delete restrict,
  evidence_role text not null default 'context'
    check (evidence_role in ('evidence_a', 'evidence_b', 'context', 'conflict', 'historical')),
  independence_key text
    check (independence_key is null or char_length(independence_key) between 1 and 200),
  linked_by text not null
    check (char_length(linked_by) between 1 and 200),
  linked_at timestamptz not null default now(),
  primary key (facility_id, observation_id),
  constraint facility_observation_links_evidence_b_check check (
    evidence_role <> 'evidence_b' or independence_key is not null
  )
);

create table if not exists elepem_core.facility_administrative_events (
  id bigint generated always as identity primary key,
  facility_id bigint not null
    references elepem_core.facilities (id)
    on update cascade on delete restrict,
  authority text not null
    check (authority in ('MSP', 'MIDES', 'PACP', 'OTHER')),
  administrative_stage text not null
    check (administrative_stage in (
      'authorization_final',
      'historical_registration',
      'social_certificate',
      'provider_registry',
      'other'
    )),
  status_label text not null
    check (char_length(status_label) between 1 and 200),
  reference_code text
    check (reference_code is null or char_length(reference_code) <= 200),
  effective_date date,
  end_date date,
  is_current boolean not null default true,
  observation_id bigint not null
    references discovery_private.facility_source_observations (id)
    on update cascade on delete restrict,
  recorded_at timestamptz not null default now(),
  constraint facility_administrative_events_dates_check check (
    end_date is null or effective_date is null or end_date >= effective_date
  ),
  constraint facility_administrative_events_current_check check (
    not is_current or end_date is null
  ),
  constraint facility_administrative_events_source_unique unique (
    facility_id,
    authority,
    administrative_stage,
    observation_id
  )
);

create table if not exists elepem_core.facility_capacity_observations (
  id bigint generated always as identity primary key,
  facility_id bigint not null
    references elepem_core.facilities (id)
    on update cascade on delete restrict,
  places integer not null check (places >= 0),
  effective_date date,
  end_date date,
  is_current boolean not null default true,
  observation_id bigint not null
    references discovery_private.facility_source_observations (id)
    on update cascade on delete restrict,
  recorded_at timestamptz not null default now(),
  constraint facility_capacity_observations_dates_check check (
    end_date is null or effective_date is null or end_date >= effective_date
  ),
  constraint facility_capacity_observations_current_check check (
    not is_current or end_date is null
  ),
  constraint facility_capacity_observations_source_unique unique (
    facility_id,
    observation_id
  )
);

create table if not exists elepem_core.facility_geocodes (
  id bigint generated always as identity primary key,
  facility_id bigint not null
    references elepem_core.facilities (id)
    on update cascade on delete restrict,
  address_id bigint not null
    references elepem_core.facility_addresses (id)
    on update cascade on delete restrict,
  provider text not null
    check (provider in ('ide_uy', 'manual', 'legacy')),
  query_original text
    check (query_original is null or char_length(query_original) <= 1000),
  query_normalized text
    check (query_normalized is null or char_length(query_normalized) <= 1000),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  precision text not null
    check (precision in ('puerta', 'calle', 'referencial')),
  precision_label text not null
    check (char_length(precision_label) between 1 and 160),
  confidence numeric(5, 4)
    check (confidence is null or confidence between 0 and 1),
  provider_response jsonb,
  manually_corrected boolean not null default false,
  reviewed_by text
    check (reviewed_by is null or char_length(reviewed_by) between 1 and 200),
  checked_at timestamptz not null,
  is_current boolean not null default true,
  observation_id bigint
    references discovery_private.facility_source_observations (id)
    on update cascade on delete restrict,
  created_at timestamptz not null default now(),
  constraint facility_geocodes_response_check check (
    provider_response is null
    or (jsonb_typeof(provider_response) = 'object' and octet_length(provider_response::text) <= 262144)
  ),
  constraint facility_geocodes_manual_check check (
    not manually_corrected or reviewed_by is not null
  ),
  constraint facility_geocodes_value_unique unique nulls not distinct (
    facility_id,
    address_id,
    provider,
    lat,
    lng,
    checked_at
  )
);

create table if not exists elepem_core.facility_reviews (
  id bigint generated always as identity primary key,
  facility_id bigint not null
    references elepem_core.facilities (id)
    on update cascade on delete restrict,
  review_type text not null
    check (review_type in ('identity', 'evidence', 'publication', 'correction', 'closure')),
  outcome text not null
    check (outcome in ('verified', 'needs_more_evidence', 'rejected', 'approve_publication', 'withdraw_publication')),
  evidence_tier text not null
    check (evidence_tier in ('A', 'B', 'C')),
  reviewer_identifier text not null
    check (char_length(reviewer_identifier) between 1 and 200),
  review_note text not null
    check (char_length(review_note) between 3 and 2000),
  created_at timestamptz not null default now(),
  constraint facility_reviews_publication_tier_check check (
    outcome <> 'approve_publication' or evidence_tier in ('A', 'B')
  )
);

create table if not exists elepem_core.audit_log (
  id bigint generated always as identity primary key,
  entity_type text not null
    check (char_length(entity_type) between 1 and 100),
  entity_key text not null
    check (char_length(entity_key) between 1 and 300),
  action text not null
    check (char_length(action) between 1 and 100),
  actor_identifier text not null
    check (char_length(actor_identifier) between 1 and 200),
  before_state jsonb,
  after_state jsonb,
  request_id text
    check (request_id is null or char_length(request_id) <= 200),
  created_at timestamptz not null default now(),
  constraint audit_log_before_state_check check (
    before_state is null or jsonb_typeof(before_state) = 'object'
  ),
  constraint audit_log_after_state_check check (
    after_state is null or jsonb_typeof(after_state) = 'object'
  )
);

create table if not exists elepem_core.legacy_facility_map (
  legacy_residencial_id text primary key
    references public.residenciales (id)
    on update cascade on delete restrict,
  facility_id bigint
    references elepem_core.facilities (id)
    on update cascade on delete restrict,
  mapping_status text not null default 'pending'
    check (mapping_status in ('mapped', 'pending', 'conflict', 'excluded')),
  match_method text
    check (match_method is null or match_method in ('exact_id', 'exact_address', 'human_review')),
  confidence numeric(5, 4)
    check (confidence is null or confidence between 0 and 1),
  conflict_note text
    check (conflict_note is null or char_length(conflict_note) <= 2000),
  mapped_by text
    check (mapped_by is null or char_length(mapped_by) between 1 and 200),
  mapped_at timestamptz,
  created_at timestamptz not null default now(),
  constraint legacy_facility_map_resolution_check check (
    (mapping_status = 'mapped' and facility_id is not null and mapped_by is not null and mapped_at is not null)
    or (mapping_status <> 'mapped' and facility_id is null)
  )
);

-- Reuse the existing discovery model instead of creating duplicate candidate,
-- observation, external-ID, suggestion and review-event tables.
alter table discovery_private.facility_source_runs
  add column if not exists source_catalog_id bigint
    references elepem_core.source_catalog (id)
    on update cascade on delete restrict;

alter table discovery_private.facility_source_observations
  add column if not exists source_catalog_id bigint
    references elepem_core.source_catalog (id)
    on update cascade on delete restrict;

alter table discovery_private.facility_candidates
  add column if not exists resolved_facility_id bigint
    references elepem_core.facilities (id)
    on update cascade on delete restrict;

alter table discovery_private.facility_candidates
  drop constraint if exists facility_candidates_verified_match_check;
alter table discovery_private.facility_candidates
  add constraint facility_candidates_verified_match_check check (
    status <> 'verified_match'
    or best_match_residencial_id is not null
    or resolved_facility_id is not null
  );

alter table discovery_private.facility_candidate_match_suggestions
  add column if not exists facility_id bigint
    references elepem_core.facilities (id)
    on update cascade on delete restrict;
alter table discovery_private.facility_candidate_match_suggestions
  alter column residencial_id drop not null;
alter table discovery_private.facility_candidate_match_suggestions
  drop constraint if exists facility_candidate_match_suggestions_owner_check;
alter table discovery_private.facility_candidate_match_suggestions
  add constraint facility_candidate_match_suggestions_owner_check check (
    num_nonnulls(residencial_id, facility_id) >= 1
  );

alter table discovery_private.facility_candidate_review_events
  add column if not exists matched_facility_id bigint
    references elepem_core.facilities (id)
    on update cascade on delete restrict;

alter table discovery_private.facility_external_ids
  add column if not exists facility_id bigint
    references elepem_core.facilities (id)
    on update cascade on delete restrict;

alter table discovery_private.facility_external_ids
  drop constraint if exists facility_external_ids_owner_check;
alter table discovery_private.facility_external_ids
  add constraint facility_external_ids_owner_check check (
    (candidate_id is not null)::integer
      + (residencial_id is not null)::integer
      + (facility_id is not null)::integer = 1
  );

create index if not exists facilities_merged_into_idx
  on elepem_core.facilities (merged_into_facility_id)
  where merged_into_facility_id is not null;
create index if not exists facilities_status_idx
  on elepem_core.facilities (publication_status, lifecycle_status, review_status);
create index if not exists facility_operators_facility_idx
  on elepem_core.facility_operators (facility_id);
create index if not exists facility_operators_organization_idx
  on elepem_core.facility_operators (organization_id);
create unique index if not exists facility_operators_current_role_key
  on elepem_core.facility_operators (facility_id, relationship_type)
  where valid_to is null;
create index if not exists facility_names_normalized_idx
  on elepem_core.facility_names (normalized_name);
create unique index if not exists facility_names_preferred_key
  on elepem_core.facility_names (facility_id)
  where is_preferred;
create index if not exists facility_addresses_location_idx
  on elepem_core.facility_addresses (department, locality, normalized_address);
create unique index if not exists facility_addresses_current_key
  on elepem_core.facility_addresses (facility_id)
  where is_current and address_type = 'physical';
create index if not exists facility_contacts_normalized_idx
  on elepem_core.facility_contacts (contact_type, normalized_value);
create index if not exists facility_social_accounts_url_idx
  on elepem_core.facility_social_accounts (public_url);
create index if not exists facility_observation_links_observation_idx
  on elepem_core.facility_observation_links (observation_id);
create index if not exists facility_administrative_events_observation_idx
  on elepem_core.facility_administrative_events (observation_id);
create index if not exists facility_administrative_events_facility_idx
  on elepem_core.facility_administrative_events (facility_id);
create unique index if not exists facility_administrative_events_current_key
  on elepem_core.facility_administrative_events (facility_id, authority)
  where is_current;
create index if not exists facility_capacity_observations_observation_idx
  on elepem_core.facility_capacity_observations (observation_id);
create index if not exists facility_capacity_observations_facility_idx
  on elepem_core.facility_capacity_observations (facility_id);
create unique index if not exists facility_capacity_observations_current_key
  on elepem_core.facility_capacity_observations (facility_id)
  where is_current;
create index if not exists facility_geocodes_address_idx
  on elepem_core.facility_geocodes (address_id);
create index if not exists facility_geocodes_facility_idx
  on elepem_core.facility_geocodes (facility_id);
create index if not exists facility_geocodes_observation_idx
  on elepem_core.facility_geocodes (observation_id)
  where observation_id is not null;
create unique index if not exists facility_geocodes_current_key
  on elepem_core.facility_geocodes (facility_id)
  where is_current;
create index if not exists facility_reviews_facility_created_idx
  on elepem_core.facility_reviews (facility_id, created_at desc);
create index if not exists audit_log_entity_created_idx
  on elepem_core.audit_log (entity_type, entity_key, created_at desc);
create index if not exists legacy_facility_map_facility_idx
  on elepem_core.legacy_facility_map (facility_id)
  where facility_id is not null;
create index if not exists facility_source_runs_catalog_idx
  on discovery_private.facility_source_runs (source_catalog_id)
  where source_catalog_id is not null;
create index if not exists facility_source_observations_catalog_idx
  on discovery_private.facility_source_observations (source_catalog_id)
  where source_catalog_id is not null;
create index if not exists facility_candidates_resolved_facility_idx
  on discovery_private.facility_candidates (resolved_facility_id)
  where resolved_facility_id is not null;
create index if not exists facility_candidate_match_suggestions_facility_idx
  on discovery_private.facility_candidate_match_suggestions (facility_id)
  where facility_id is not null;
create unique index if not exists facility_candidate_match_suggestions_candidate_facility_key
  on discovery_private.facility_candidate_match_suggestions (candidate_id, facility_id)
  where facility_id is not null;
create index if not exists facility_candidate_review_events_matched_facility_idx
  on discovery_private.facility_candidate_review_events (matched_facility_id)
  where matched_facility_id is not null;
create index if not exists facility_external_ids_facility_idx
  on discovery_private.facility_external_ids (facility_id)
  where facility_id is not null;

create or replace function elepem_core.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function elepem_core.reject_append_only_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'ELEPEM audit and review records are append-only'
    using errcode = '55000';
end;
$$;

create or replace function elepem_core.enforce_facility_publication()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.publication_status = 'approved' and not exists (
    select 1
    from elepem_core.facility_reviews as review
    where review.facility_id = new.id
      and review.review_type = 'publication'
      and review.outcome = 'approve_publication'
      and review.evidence_tier in ('A', 'B')
  ) then
    raise exception using
      errcode = '23514',
      message = 'approved publication requires an append-only human review with evidence tier A or B';
  end if;

  return new;
end;
$$;

revoke all on function elepem_core.touch_updated_at()
  from public, anon, authenticated, service_role;
revoke all on function elepem_core.reject_append_only_mutation()
  from public, anon, authenticated, service_role;
revoke all on function elepem_core.enforce_facility_publication()
  from public, anon, authenticated, service_role;

drop trigger if exists source_catalog_touch_updated_at
  on elepem_core.source_catalog;
create trigger source_catalog_touch_updated_at
before update on elepem_core.source_catalog
for each row execute function elepem_core.touch_updated_at();

drop trigger if exists organizations_touch_updated_at
  on elepem_core.organizations;
create trigger organizations_touch_updated_at
before update on elepem_core.organizations
for each row execute function elepem_core.touch_updated_at();

drop trigger if exists facilities_touch_updated_at
  on elepem_core.facilities;
create trigger facilities_touch_updated_at
before update on elepem_core.facilities
for each row execute function elepem_core.touch_updated_at();

drop trigger if exists facilities_publication_guard
  on elepem_core.facilities;
create trigger facilities_publication_guard
before insert or update of publication_status on elepem_core.facilities
for each row execute function elepem_core.enforce_facility_publication();

drop trigger if exists facility_reviews_append_only
  on elepem_core.facility_reviews;
create trigger facility_reviews_append_only
before update or delete on elepem_core.facility_reviews
for each row execute function elepem_core.reject_append_only_mutation();

drop trigger if exists audit_log_append_only
  on elepem_core.audit_log;
create trigger audit_log_append_only
before update or delete on elepem_core.audit_log
for each row execute function elepem_core.reject_append_only_mutation();

-- Rebuild the view layer without CASCADE. A future unexpected dependency must
-- stop the migration instead of being removed implicitly.
drop view if exists public.known_facilities_exclusion_view;
drop view if exists public.residenciales_legacy_compat;
drop view if exists public.facilities_public_approved;
drop view if exists public.facilities_current_internal;

create or replace view public.facilities_current_internal
with (security_invoker = true)
as
select
  facility.id as facility_id,
  facility.facility_key,
  facility.lifecycle_status,
  facility.review_status,
  facility.publication_status,
  preferred_name.name,
  preferred_name.normalized_name,
  current_address.department,
  current_address.locality,
  current_address.address_line as address,
  current_geocode.lat,
  current_geocode.lng,
  current_geocode.precision,
  current_capacity.places,
  facility.created_at,
  facility.updated_at
from elepem_core.facilities as facility
left join lateral (
  select facility_name.name, facility_name.normalized_name
  from elepem_core.facility_names as facility_name
  where facility_name.facility_id = facility.id
    and facility_name.is_preferred
  order by facility_name.id desc
  limit 1
) as preferred_name on true
left join lateral (
  select address.department, address.locality, address.address_line
  from elepem_core.facility_addresses as address
  where address.facility_id = facility.id
    and address.is_current
    and address.address_type = 'physical'
  order by address.id desc
  limit 1
) as current_address on true
left join lateral (
  select geocode.lat, geocode.lng, geocode.precision
  from elepem_core.facility_geocodes as geocode
  where geocode.facility_id = facility.id and geocode.is_current
  order by geocode.id desc
  limit 1
) as current_geocode on true
left join lateral (
  select capacity.places
  from elepem_core.facility_capacity_observations as capacity
  where capacity.facility_id = facility.id and capacity.is_current
  order by capacity.id desc
  limit 1
) as current_capacity on true;

create or replace view public.facilities_public_approved
with (security_invoker = true)
as
select
  facility.facility_key as id,
  preferred_name.name,
  current_address.department,
  current_address.locality,
  current_address.address_line as address,
  current_capacity.places,
  current_geocode.lat,
  current_geocode.lng,
  current_geocode.precision,
  current_geocode.precision_label,
  case
    when current_administrative.administrative_stage = 'authorization_final' then 'habilitado'
    when current_administrative.administrative_stage in (
      'historical_registration', 'social_certificate', 'provider_registry'
    ) then 'registro'
    else 'verificar'
  end as status_group,
  coalesce(current_administrative.administrative_stage, 'human_verified') as status_stage,
  coalesce(current_administrative.status_label, 'Verificado con evidencia pública') as status_short,
  format('Revisión humana; evidencia nivel %s', publication_review.evidence_tier) as source_label,
  facility.created_at,
  facility.updated_at,
  exists (
    select 1 from elepem_core.facility_administrative_events as event
    where event.facility_id = facility.id
      and event.administrative_stage = 'authorization_final'
  ) as msp_final,
  exists (
    select 1 from elepem_core.facility_administrative_events as event
    where event.facility_id = facility.id
      and event.administrative_stage = 'historical_registration'
  ) as msp_registro_historico,
  exists (
    select 1 from elepem_core.facility_administrative_events as event
    where event.facility_id = facility.id
      and event.administrative_stage = 'social_certificate'
  ) as mides_social,
  exists (
    select 1 from elepem_core.facility_administrative_events as event
    where event.facility_id = facility.id
      and event.administrative_stage = 'provider_registry'
  ) as pacp,
  exists (
    select 1 from elepem_core.facility_observation_links as source_link
    join discovery_private.facility_source_observations as observation
      on observation.id = source_link.observation_id
    where source_link.facility_id = facility.id
      and observation.source_type not in ('official', 'social_public_url')
  ) as other_source
from elepem_core.facilities as facility
join lateral (
  select facility_name.name
  from elepem_core.facility_names as facility_name
  where facility_name.facility_id = facility.id
    and facility_name.is_preferred
  order by facility_name.id desc
  limit 1
) as preferred_name on true
join lateral (
  select address.department, address.locality, address.address_line
  from elepem_core.facility_addresses as address
  where address.facility_id = facility.id
    and address.is_current
    and address.address_type = 'physical'
  order by address.id desc
  limit 1
) as current_address on true
join lateral (
  select geocode.lat, geocode.lng, geocode.precision, geocode.precision_label
  from elepem_core.facility_geocodes as geocode
  where geocode.facility_id = facility.id and geocode.is_current
  order by geocode.id desc
  limit 1
) as current_geocode on true
left join lateral (
  select capacity.places
  from elepem_core.facility_capacity_observations as capacity
  where capacity.facility_id = facility.id and capacity.is_current
  order by capacity.id desc
  limit 1
) as current_capacity on true
left join lateral (
  select event.administrative_stage, event.status_label
  from elepem_core.facility_administrative_events as event
  where event.facility_id = facility.id and event.is_current
  order by
    case event.administrative_stage
      when 'authorization_final' then 1
      when 'historical_registration' then 2
      when 'social_certificate' then 3
      when 'provider_registry' then 4
      else 5
    end,
    event.recorded_at desc
  limit 1
) as current_administrative on true
join lateral (
  select review.evidence_tier
  from elepem_core.facility_reviews as review
  where review.facility_id = facility.id
    and review.review_type = 'publication'
    and review.outcome = 'approve_publication'
    and review.evidence_tier in ('A', 'B')
  order by review.created_at desc, review.id desc
  limit 1
) as publication_review on true
where facility.lifecycle_status = 'current'
  and facility.publication_status = 'approved';

create or replace view public.residenciales_legacy_compat
with (security_invoker = true)
as
select
  residencial.id,
  residencial.name,
  residencial.department,
  residencial.locality,
  residencial.address,
  residencial.places,
  residencial.lat,
  residencial.lng,
  residencial.precision,
  residencial.precision_label,
  residencial.status_group,
  residencial.status_stage,
  residencial.status_short,
  residencial.source_label,
  residencial.created_at,
  residencial.updated_at,
  residencial.msp_final,
  residencial.msp_registro_historico,
  residencial.mides_social,
  residencial.pacp,
  residencial.other_source
from public.residenciales as residencial;

create or replace view public.known_facilities_exclusion_view
with (security_invoker = true)
as
select
  'normalized_facility'::text as subject_type,
  facility.facility_key as subject_id,
  facility_name.name,
  facility_name.normalized_name,
  address.department,
  address.locality,
  address.address_line as address,
  facility.lifecycle_status,
  facility.review_status,
  null::text as evidence_tier,
  observation.source_url,
  facility.updated_at as last_seen_at
from elepem_core.facilities as facility
left join lateral (
  select name.name, name.normalized_name
  from elepem_core.facility_names as name
  where name.facility_id = facility.id and name.is_preferred
  order by name.id desc limit 1
) as facility_name on true
left join lateral (
  select facility_address.department, facility_address.locality, facility_address.address_line
  from elepem_core.facility_addresses as facility_address
  where facility_address.facility_id = facility.id and facility_address.is_current
  order by facility_address.id desc limit 1
) as address on true
left join lateral (
  select source_observation.source_url
  from elepem_core.facility_observation_links as source_link
  join discovery_private.facility_source_observations as source_observation
    on source_observation.id = source_link.observation_id
  where source_link.facility_id = facility.id
  order by source_link.linked_at desc limit 1
) as observation on true
where facility.review_status <> 'rejected'
union all
select
  'legacy_residencial'::text,
  residencial.id,
  residencial.name,
  lower(regexp_replace(residencial.name, '[^[:alnum:]]+', ' ', 'g')),
  residencial.department,
  residencial.locality,
  residencial.address,
  'legacy'::text,
  residencial.status_group,
  null::text,
  null::text,
  residencial.updated_at
from public.residenciales as residencial
where not exists (
  select 1
  from elepem_core.legacy_facility_map as mapping
  where mapping.legacy_residencial_id = residencial.id
    and mapping.mapping_status = 'mapped'
)
union all
select
  'private_candidate'::text,
  candidate.candidate_key,
  candidate.normalized_name,
  candidate.normalized_name,
  candidate.normalized_department,
  candidate.normalized_locality,
  candidate.normalized_address,
  candidate.status,
  case when candidate.human_reviewed then 'reviewed' else 'unreviewed' end,
  candidate.evidence_tier,
  null::text,
  candidate.last_seen_at
from discovery_private.facility_candidates as candidate
where candidate.status not in ('rejected', 'duplicate', 'closed');

revoke all on table
  public.facilities_current_internal,
  public.facilities_public_approved,
  public.residenciales_legacy_compat,
  public.known_facilities_exclusion_view
from public, anon, authenticated, service_role;

alter table elepem_core.source_catalog enable row level security;
alter table elepem_core.source_catalog force row level security;
alter table elepem_core.organizations enable row level security;
alter table elepem_core.organizations force row level security;
alter table elepem_core.facilities enable row level security;
alter table elepem_core.facilities force row level security;
alter table elepem_core.facility_operators enable row level security;
alter table elepem_core.facility_operators force row level security;
alter table elepem_core.facility_names enable row level security;
alter table elepem_core.facility_names force row level security;
alter table elepem_core.facility_addresses enable row level security;
alter table elepem_core.facility_addresses force row level security;
alter table elepem_core.facility_contacts enable row level security;
alter table elepem_core.facility_contacts force row level security;
alter table elepem_core.facility_social_accounts enable row level security;
alter table elepem_core.facility_social_accounts force row level security;
alter table elepem_core.facility_observation_links enable row level security;
alter table elepem_core.facility_observation_links force row level security;
alter table elepem_core.facility_administrative_events enable row level security;
alter table elepem_core.facility_administrative_events force row level security;
alter table elepem_core.facility_capacity_observations enable row level security;
alter table elepem_core.facility_capacity_observations force row level security;
alter table elepem_core.facility_geocodes enable row level security;
alter table elepem_core.facility_geocodes force row level security;
alter table elepem_core.facility_reviews enable row level security;
alter table elepem_core.facility_reviews force row level security;
alter table elepem_core.audit_log enable row level security;
alter table elepem_core.audit_log force row level security;
alter table elepem_core.legacy_facility_map enable row level security;
alter table elepem_core.legacy_facility_map force row level security;

revoke all on all tables in schema elepem_core
  from public, anon, authenticated, service_role;
revoke all on all sequences in schema elepem_core
  from public, anon, authenticated, service_role;
revoke all on all functions in schema elepem_core
  from public, anon, authenticated, service_role;

alter default privileges in schema elepem_core
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges in schema elepem_core
  revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges in schema elepem_core
  revoke all on functions from public, anon, authenticated, service_role;

-- The server-side import/review code may populate transition links. RLS remains
-- deny-by-default, so these grants do not create browser access.
grant update (source_catalog_id)
  on discovery_private.facility_source_runs,
     discovery_private.facility_source_observations
  to service_role;
grant update (resolved_facility_id)
  on discovery_private.facility_candidates
  to service_role;
grant update (facility_id)
  on discovery_private.facility_candidate_match_suggestions,
     discovery_private.facility_external_ids
  to service_role;

comment on schema elepem_core is
  'Canonical private operational model for ELEPEM facilities; not exposed directly through the Data API.';
comment on table elepem_core.facilities is
  'One stable row per physical facility. Names, addresses, operators and observations are separate.';
comment on table elepem_core.facility_social_accounts is
  'Only public URL, check time and a brief human note may be retained for Instagram/Facebook.';
comment on table elepem_core.facility_reviews is
  'Append-only human decisions; approval requires evidence tier A or B.';
comment on view public.facilities_public_approved is
  'Server-facing approved map projection. No anonymous grant is created by this migration.';
comment on view public.residenciales_legacy_compat is
  'Phase-1 compatibility projection over the unchanged legacy table; redefined only after reconciliation.';
comment on view public.known_facilities_exclusion_view is
  'Private matching/exclusion projection spanning normalized, unmapped legacy and candidate records.';

commit;
