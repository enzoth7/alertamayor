-- Rollback for 20260802041423_create_private_discovery_workflow.sql.
-- No CASCADE is used: rollback stops rather than deleting unexpected objects.

drop table if exists discovery_private.facility_external_ids;
drop table if exists discovery_private.facility_candidate_sources;
drop table if exists discovery_private.facility_candidates;
drop table if exists discovery_private.facility_source_observations;
drop table if exists discovery_private.facility_source_runs;

drop function if exists discovery_private.enforce_candidate_public_eligibility();
drop schema if exists discovery_private;
