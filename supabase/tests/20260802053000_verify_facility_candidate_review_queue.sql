-- Run only against a disposable local/test database. Always rolls back.
begin;

do $$
declare
  table_name text;
  rls_enabled boolean;
  rls_forced boolean;
begin
  foreach table_name in array array[
    'facility_candidate_match_suggestions',
    'facility_candidate_review_events'
  ] loop
    if to_regclass(format('discovery_private.%I', table_name)) is null then
      raise exception 'Missing review queue table: %', table_name;
    end if;

    select class.relrowsecurity, class.relforcerowsecurity
      into rls_enabled, rls_forced
    from pg_class as class
    join pg_namespace as namespace on namespace.oid = class.relnamespace
    where namespace.nspname = 'discovery_private'
      and class.relname = table_name;

    if not coalesce(rls_enabled, false) or not coalesce(rls_forced, false) then
      raise exception 'RLS is not enabled and forced on %', table_name;
    end if;

    if has_table_privilege('anon', format('discovery_private.%I', table_name), 'select')
      or has_table_privilege('authenticated', format('discovery_private.%I', table_name), 'select')
    then
      raise exception 'Browser role can read %', table_name;
    end if;
  end loop;

  if exists (
    select 1 from pg_policies
    where schemaname = 'discovery_private'
      and tablename = any(array[
        'facility_candidate_match_suggestions',
        'facility_candidate_review_events'
      ])
  ) then
    raise exception 'Private review tables must not have Data API policies';
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'discovery_private'
      and indexname = 'facility_candidate_review_events_matched_residencial_idx'
  ) then
    raise exception 'Missing covering index for matched residential reviews';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'facility_candidate_review_events_append_only'
      and not tgisinternal
  ) then
    raise exception 'Missing append-only review event trigger';
  end if;
end;
$$;

select count(*)::integer as public_residenciales
from public.residenciales;

rollback;
