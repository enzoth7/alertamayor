create policy "Deny direct Data API access"
on public.residenciales
for all
to anon, authenticated
using (false)
with check (false);

drop index public.residenciales_department_idx;
drop index public.residenciales_status_group_idx;
drop index public.residenciales_department_status_idx;
