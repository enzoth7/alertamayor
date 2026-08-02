-- Keep candidate review history append-only and cover its existing-facility FK.

create index if not exists facility_candidate_review_events_matched_residencial_idx
  on discovery_private.facility_candidate_review_events (matched_residencial_id)
  where matched_residencial_id is not null;

create or replace function discovery_private.reject_facility_candidate_review_event_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'facility candidate review events are append-only'
    using errcode = '55000';
end;
$$;

revoke all on function discovery_private.reject_facility_candidate_review_event_mutation()
from public, anon, authenticated, service_role;

drop trigger if exists facility_candidate_review_events_append_only
  on discovery_private.facility_candidate_review_events;
create trigger facility_candidate_review_events_append_only
before update or delete on discovery_private.facility_candidate_review_events
for each row execute function discovery_private.reject_facility_candidate_review_event_mutation();
