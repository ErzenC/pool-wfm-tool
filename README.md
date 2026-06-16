# Pool WFM

Mobile-first Aqua Park workforce management for manual daily two-shift staffing and restricted clocking.

Staffing remains manual. The app does not automatically recommend or assign workers.

## Current MVP

- Next.js App Router
- TypeScript
- Tailwind CSS
- Mock admin and worker login
- localStorage persistence while Supabase is being prepared
- Manual Shift 1 / Shift 2 assignment
- Worker Clock In / Clock Out restricted by exact Aqua Park IPs
- Admin clock override and hours export
- Real weather from Open-Meteo through `/api/weather`
- Supabase schema, RLS, seed data, and client scaffolding

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Mock login

Development-only credentials:

- Admin: `admin@poolwfm.local` / `admin123`
- Worker: `2026001` / `diar123`
- Admin-created worker example: `2026005` / password chosen by admin

Do not use these passwords in production.

## Weather

Weather is fetched server-side from Open-Meteo using Kosovo city coordinates and an exact ISO date.

The app requests:

- `temperature_2m_max`
- `temperature_2m_min`
- `precipitation_probability_max`
- `precipitation_sum`
- `weather_code`
- `wind_speed_10m_max`

Weather is informational only. It does not assign workers or calculate required staffing.

## Clocking

Worker Clock In / Clock Out is allowed only from these exact IPs:

- `172.16.5.31`
- `172.16.5.21`

The IP check is performed server-side by:

- `GET /api/clock/status`
- `POST /api/clock/action`

Workers can view staffing and schedule information from anywhere, but clock buttons are disabled outside authorized Aqua Park networks.

Admins can manually Clock In or Clock Out assigned workers from anywhere. Admin-created events are marked with `ADMIN_OVERRIDE` and include an audit tooltip in the Hours module.

## Supabase Setup

Copy `.env.example` to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` in browser code.

Apply migrations from:

- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_rls_policies.sql`

Load development seed data from:

- `supabase/seed.sql`

The seed file is development-only. Create matching Supabase Auth users separately or through the secure server-side admin action scaffold.

## Database Model

Tables:

- `profiles`
- `sectors`
- `workers`
- `shift_assignments`
- `clock_logs`
- `allowed_clock_ips`

Important constraints:

- worker `employee_code` is unique
- worker `username` is unique
- worker `rating` is between 1 and 5
- assignment `shift_number` is 1 or 2
- a worker can only be assigned once per work date

Shift assignment records store worker IDs, not worker names.

## Manual Tests

1. Login as worker: `2026001` / `diar123`.
2. Confirm staffing and sector schedule are visible from anywhere.
3. Confirm Clock In / Clock Out is only allowed from `172.16.5.31` or `172.16.5.21`.
4. Clock In as worker from an allowed IP.
5. Clock Out as worker.
6. Confirm the worker cannot clock in again after clocking out.
7. Login as admin: `admin@poolwfm.local` / `admin123`.
8. Manually clock the worker in again from the Staffing page.
9. Open Hours and hover the admin override badge to see the audit tooltip.
10. Export hours CSV from the Hours module.

## Admin-Created Worker Test

1. Login as admin: `admin@poolwfm.local` / `admin123`.
2. Open Workers.
3. Create worker ID `2026005`, first name `Test`, last name `Worker`, sector `Restaurant`, active `true`, and password `test123`.
4. Logout.
5. Login as worker with `2026005` / `test123`.
6. Confirm the worker dashboard loads without `Worker not found`.
7. Select a future or past schedule date and confirm clocking says `Clock In/Out is only available for today.`
8. Login as admin, open Staffing, select yesterday or tomorrow, and confirm clock override buttons are disabled with the locked-date message.

## Migration Utility

The Settings screen includes a temporary admin-only localStorage validation panel.

When Supabase becomes the source of truth, localStorage should be imported once through secure server actions, then no longer treated as authoritative.
