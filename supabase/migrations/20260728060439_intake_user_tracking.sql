alter table public.intake_reports
  add column current_status text not null default 'received'
    check (current_status in ('received', 'triage', 'in_review', 'contact', 'referred', 'resolved', 'closed')),
  add column updated_at timestamptz not null default now();

create table public.intake_report_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.intake_reports(id) on delete cascade,
  status text not null
    check (status in ('received', 'triage', 'in_review', 'contact', 'referred', 'resolved', 'closed')),
  public_title text not null check (char_length(public_title) between 1 and 120),
  public_description text not null check (char_length(public_description) between 1 and 500),
  internal_note text check (internal_note is null or char_length(internal_note) <= 4000),
  event_data jsonb not null default '{}'::jsonb
    check (jsonb_typeof(event_data) = 'object' and octet_length(event_data::text) <= 8192),
  actor text not null default 'system' check (actor in ('system', 'organization')),
  created_at timestamptz not null default now()
);

create index intake_report_events_report_created_idx
  on public.intake_report_events (report_id, created_at);

create table public.intake_report_attachments (
  id uuid primary key,
  report_id uuid not null references public.intake_reports(id) on delete cascade,
  bucket_id text not null default 'intake-evidence' check (bucket_id = 'intake-evidence'),
  object_path text not null unique check (char_length(object_path) between 1 and 500),
  file_name text not null check (char_length(file_name) between 1 and 240),
  mime_type text not null check (char_length(mime_type) between 1 and 160),
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  created_at timestamptz not null default now()
);

create index intake_report_attachments_report_created_idx
  on public.intake_report_attachments (report_id, created_at);

create table public.intake_notification_log (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.intake_reports(id) on delete cascade,
  kind text not null check (kind = 'tracking_code_email'),
  provider_message_id text check (provider_message_id is null or char_length(provider_message_id) <= 240),
  created_at timestamptz not null default now(),
  unique (report_id, kind)
);

alter table public.intake_report_events enable row level security;
alter table public.intake_report_attachments enable row level security;
alter table public.intake_notification_log enable row level security;

revoke all on table public.intake_report_events from public, anon, authenticated;
revoke all on table public.intake_report_attachments from public, anon, authenticated;
revoke all on table public.intake_notification_log from public, anon, authenticated;

grant all on table public.intake_report_events to service_role;
grant all on table public.intake_report_attachments to service_role;
grant all on table public.intake_notification_log to service_role;

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;

create or replace function app_private.record_intake_received()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  insert into public.intake_report_events (
    report_id,
    status,
    public_title,
    public_description,
    actor
  ) values (
    new.id,
    'received',
    'Comunicación recibida',
    'La comunicación quedó registrada y está disponible para la revisión inicial.',
    'system'
  );
  return new;
end;
$$;

revoke execute on function app_private.record_intake_received() from public, anon, authenticated;

create trigger intake_reports_record_received
after insert on public.intake_reports
for each row
execute function app_private.record_intake_received();

insert into public.intake_report_events (
  report_id,
  status,
  public_title,
  public_description,
  actor,
  created_at
)
select
  report.id,
  'received',
  'Comunicación recibida',
  'La comunicación quedó registrada y está disponible para la revisión inicial.',
  'system',
  report.created_at
from public.intake_reports as report
where not exists (
  select 1
  from public.intake_report_events as event
  where event.report_id = report.id
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'intake-evidence',
  'intake-evidence',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
