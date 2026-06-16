create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'worker')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sectors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  employee_code text not null unique,
  first_name text not null,
  last_name text not null,
  username text not null unique,
  job_title text not null,
  sector_id uuid not null references public.sectors(id) on delete restrict,
  rating integer not null check (rating between 1 and 5),
  active boolean not null default true,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shift_assignments (
  id uuid primary key default gen_random_uuid(),
  work_date date not null,
  sector_id uuid not null references public.sectors(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete cascade,
  shift_number integer not null check (shift_number in (1, 2)),
  shift_start time,
  shift_end time,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (work_date, worker_id)
);

create table if not exists public.clock_logs (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers(id) on delete cascade,
  type text not null check (type in ('CLOCK_IN', 'CLOCK_OUT')),
  timestamp timestamptz not null default now(),
  date date not null,
  created_by text not null,
  source text not null check (source in ('WORKER', 'ADMIN_OVERRIDE')),
  note text,
  ip_address inet,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.allowed_clock_ips (
  id uuid primary key default gen_random_uuid(),
  ip_address inet not null unique,
  location_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_workers_sector_id on public.workers(sector_id);
create index if not exists idx_shift_assignments_work_date_sector_id
  on public.shift_assignments(work_date, sector_id);
create index if not exists idx_clock_logs_worker_date on public.clock_logs(worker_id, date);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_sectors_updated_at on public.sectors;
create trigger set_sectors_updated_at
before update on public.sectors
for each row execute function public.set_updated_at();

drop trigger if exists set_workers_updated_at on public.workers;
create trigger set_workers_updated_at
before update on public.workers
for each row execute function public.set_updated_at();

drop trigger if exists set_shift_assignments_updated_at on public.shift_assignments;
create trigger set_shift_assignments_updated_at
before update on public.shift_assignments
for each row execute function public.set_updated_at();

drop trigger if exists set_clock_logs_updated_at on public.clock_logs;
create trigger set_clock_logs_updated_at
before update on public.clock_logs
for each row execute function public.set_updated_at();

drop trigger if exists set_allowed_clock_ips_updated_at on public.allowed_clock_ips;
create trigger set_allowed_clock_ips_updated_at
before update on public.allowed_clock_ips
for each row execute function public.set_updated_at();
