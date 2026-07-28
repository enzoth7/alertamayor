create policy "No direct access to intake events"
on public.intake_report_events
for all
to anon, authenticated
using (false)
with check (false);

create policy "No direct access to intake attachments"
on public.intake_report_attachments
for all
to anon, authenticated
using (false)
with check (false);

create policy "No direct access to notification log"
on public.intake_notification_log
for all
to anon, authenticated
using (false)
with check (false);
