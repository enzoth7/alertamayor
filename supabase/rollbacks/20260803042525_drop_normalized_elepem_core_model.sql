-- Explicit rollback for 20260803042525_normalized_elepem_core_model.sql.
-- Kept outside supabase/migrations so the CLI cannot apply it as a forward migration.
-- No CASCADE is used: rollback stops rather than deleting unexpected objects.

begin;

drop view if exists public.known_facilities_exclusion_view;
drop view if exists public.residenciales_legacy_compat;
drop view if exists public.facilities_public_approved;
drop view if exists public.facilities_current_internal;

revoke update (facility_id)
  on discovery_private.facility_candidate_match_suggestions,
     discovery_private.facility_external_ids
  from service_role;
revoke update (resolved_facility_id)
  on discovery_private.facility_candidates
  from service_role;
revoke update (source_catalog_id)
  on discovery_private.facility_source_runs,
     discovery_private.facility_source_observations
  from service_role;

-- Remove only normalized transition IDs whose sole owner is about to be
-- dropped. Candidate-owned and legacy-owned identifiers remain intact.
delete from discovery_private.facility_external_ids
where facility_id is not null;

drop index if exists discovery_private.facility_external_ids_facility_idx;
alter table discovery_private.facility_external_ids
  drop constraint if exists facility_external_ids_owner_check;
alter table discovery_private.facility_external_ids
  drop column if exists facility_id;
alter table discovery_private.facility_external_ids
  add constraint facility_external_ids_owner_check check (
    (candidate_id is not null)::integer + (residencial_id is not null)::integer = 1
  );

drop index if exists discovery_private.facility_candidate_review_events_matched_facility_idx;
alter table discovery_private.facility_candidate_review_events
  drop column if exists matched_facility_id;

-- Normalized-only suggestions cannot exist after facility_id is removed.
-- Legacy-backed suggestions remain intact.
delete from discovery_private.facility_candidate_match_suggestions
where residencial_id is null;
drop index if exists discovery_private.facility_candidate_match_suggestions_candidate_facility_key;
drop index if exists discovery_private.facility_candidate_match_suggestions_facility_idx;
alter table discovery_private.facility_candidate_match_suggestions
  drop constraint if exists facility_candidate_match_suggestions_owner_check;
alter table discovery_private.facility_candidate_match_suggestions
  drop column if exists facility_id;
alter table discovery_private.facility_candidate_match_suggestions
  alter column residencial_id set not null;

drop index if exists discovery_private.facility_candidates_resolved_facility_idx;
alter table discovery_private.facility_candidates
  drop constraint if exists facility_candidates_verified_match_check;
alter table discovery_private.facility_candidates
  drop column if exists resolved_facility_id;
alter table discovery_private.facility_candidates
  add constraint facility_candidates_verified_match_check check (
    status <> 'verified_match' or best_match_residencial_id is not null
  );

drop index if exists discovery_private.facility_source_observations_catalog_idx;
alter table discovery_private.facility_source_observations
  drop column if exists source_catalog_id;

drop index if exists discovery_private.facility_source_runs_catalog_idx;
alter table discovery_private.facility_source_runs
  drop column if exists source_catalog_id;

drop trigger if exists audit_log_append_only on elepem_core.audit_log;
drop trigger if exists facility_reviews_append_only on elepem_core.facility_reviews;
drop trigger if exists facilities_publication_guard on elepem_core.facilities;
drop trigger if exists facilities_touch_updated_at on elepem_core.facilities;
drop trigger if exists organizations_touch_updated_at on elepem_core.organizations;
drop trigger if exists source_catalog_touch_updated_at on elepem_core.source_catalog;

drop table if exists elepem_core.legacy_facility_map;
drop table if exists elepem_core.audit_log;
drop table if exists elepem_core.facility_reviews;
drop table if exists elepem_core.facility_geocodes;
drop table if exists elepem_core.facility_capacity_observations;
drop table if exists elepem_core.facility_administrative_events;
drop table if exists elepem_core.facility_observation_links;
drop table if exists elepem_core.facility_social_accounts;
drop table if exists elepem_core.facility_contacts;
drop table if exists elepem_core.facility_addresses;
drop table if exists elepem_core.facility_names;
drop table if exists elepem_core.facility_operators;
drop table if exists elepem_core.facilities;
drop table if exists elepem_core.organizations;
drop table if exists elepem_core.source_catalog;

drop function if exists elepem_core.enforce_facility_publication();
drop function if exists elepem_core.reject_append_only_mutation();
drop function if exists elepem_core.touch_updated_at();
drop schema if exists elepem_core;

commit;
