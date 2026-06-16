alter table public.profiles enable row level security;
alter table public.sectors enable row level security;
alter table public.workers enable row level security;
alter table public.shift_assignments enable row level security;
alter table public.clock_logs enable row level security;
alter table public.allowed_clock_ips enable row level security;

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where auth_user_id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() = 'admin'
$$;

drop policy if exists "admins manage profiles" on public.profiles;
create policy "admins manage profiles"
on public.profiles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "workers read own profile" on public.profiles;
create policy "workers read own profile"
on public.profiles
for select
to authenticated
using (auth_user_id = auth.uid());

drop policy if exists "admins manage sectors" on public.sectors;
create policy "admins manage sectors"
on public.sectors
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "workers read active sectors" on public.sectors;
create policy "workers read active sectors"
on public.sectors
for select
to authenticated
using (active = true);

drop policy if exists "admins manage workers" on public.workers;
create policy "admins manage workers"
on public.workers
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "workers read own worker profile" on public.workers;
create policy "workers read own worker profile"
on public.workers
for select
to authenticated
using (auth_user_id = auth.uid());

drop policy if exists "admins manage shift assignments" on public.shift_assignments;
create policy "admins manage shift assignments"
on public.shift_assignments
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "workers read shift assignments" on public.shift_assignments;
create policy "workers read shift assignments"
on public.shift_assignments
for select
to authenticated
using (true);

drop policy if exists "admins manage clock logs" on public.clock_logs;
create policy "admins manage clock logs"
on public.clock_logs
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "workers read own clock logs" on public.clock_logs;
create policy "workers read own clock logs"
on public.clock_logs
for select
to authenticated
using (
  worker_id in (
    select id from public.workers where auth_user_id = auth.uid()
  )
);

drop policy if exists "admins manage allowed clock ips" on public.allowed_clock_ips;
create policy "admins manage allowed clock ips"
on public.allowed_clock_ips
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.get_staffing_display(target_date date, target_sector_id uuid)
returns table (
  assignment_id uuid,
  work_date date,
  sector_id uuid,
  worker_id uuid,
  shift_number integer,
  first_name text,
  last_name text,
  job_title text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    sa.id,
    sa.work_date,
    sa.sector_id,
    sa.worker_id,
    sa.shift_number,
    w.first_name,
    w.last_name,
    w.job_title
  from public.shift_assignments sa
  join public.workers w on w.id = sa.worker_id
  join public.sectors s on s.id = sa.sector_id
  where sa.work_date = target_date
    and sa.sector_id = target_sector_id
    and w.active = true
    and s.active = true;
$$;

grant execute on function public.get_staffing_display(date, uuid) to authenticated;
