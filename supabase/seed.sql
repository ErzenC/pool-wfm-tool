-- Development-only seed data.
-- Do not use these passwords in production.
-- Create matching Supabase Auth users separately or through secure server-side admin tooling:
-- admin@poolwfm.local / admin123
-- 2026001 / diar123

insert into public.allowed_clock_ips (ip_address, location_name, is_active)
values
  ('172.16.5.31', 'Aqua Park Lin Projekt 3 / Entrance', true),
  ('172.16.5.21', 'Aqua Park Lin Projekt 2 / Restaurant', true)
on conflict (ip_address) do update
set location_name = excluded.location_name,
    is_active = excluded.is_active;

insert into public.sectors (id, name, description, active)
values
  ('00000000-0000-0000-0000-000000000001', 'Entrance', 'Entrance and ticket control', true),
  ('00000000-0000-0000-0000-000000000002', 'Restaurant', 'Restaurant and food service', true),
  ('00000000-0000-0000-0000-000000000003', 'Pool Area', 'Pool supervision and guest support', true),
  ('00000000-0000-0000-0000-000000000004', 'Slides', 'Slide operation and queue safety', true),
  ('00000000-0000-0000-0000-000000000005', 'Cleaning', 'Cleaning and hygiene operations', true),
  ('00000000-0000-0000-0000-000000000006', 'Security', 'Security and guest safety', true)
on conflict (id) do update
set name = excluded.name,
    description = excluded.description,
    active = excluded.active;

insert into public.workers (
  id,
  employee_code,
  first_name,
  last_name,
  username,
  job_title,
  sector_id,
  rating,
  active,
  must_change_password
)
values
  (
    '10000000-0000-0000-0000-000000000001',
    '2026001',
    'Diar',
    'Haxhimehmeti',
    '2026001',
    'Restaurant Worker',
    '00000000-0000-0000-0000-000000000002',
    4,
    true,
    false
  )
on conflict (employee_code) do update
set first_name = excluded.first_name,
    last_name = excluded.last_name,
    username = excluded.username,
    job_title = excluded.job_title,
    sector_id = excluded.sector_id,
    rating = excluded.rating,
    active = excluded.active;

insert into public.shift_assignments (
  work_date,
  sector_id,
  worker_id,
  shift_number,
  shift_start,
  shift_end
)
values
  (current_date, '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 1, '09:00', '15:00'),
  (current_date + interval '1 day', '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 2, '15:00', '21:00')
on conflict (work_date, worker_id) do nothing;
