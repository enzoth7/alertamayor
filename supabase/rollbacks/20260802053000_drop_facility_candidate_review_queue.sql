begin;

drop table if exists discovery_private.facility_candidate_review_events;
drop table if exists discovery_private.facility_candidate_match_suggestions;
drop function if exists discovery_private.reject_facility_candidate_review_event_mutation();

commit;
