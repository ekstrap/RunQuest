-- RunQuest cloud sync schema (issue #11).
-- Applied to the RunQuest Supabase project on 2026-08-18. Checked in so the
-- schema is reviewable and reproducible, and so a future environment can be
-- built from the repo rather than from the dashboard.
--
-- Two tables, both scoped to the signed-in user by row-level security:
--   profiles — one row per account: progression (XP/level), onboarding
--              selections, and the invisible calibration step.
--   sessions — the user's completed run history.
-- Anonymous ("Just run") users never touch these; their data lives on-device.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- Onboarding selections. Null until onboarding is completed.
  bracket text check (bracket in ('never-run', 'run-occasionally', 'getting-back')),
  weekly_commitment smallint check (weekly_commitment in (2, 3)),
  -- The invisible calibration rung (DESIGN.md 3.20). Null until first written.
  calibration_step integer check (calibration_step >= 0),
  -- Progression: the reward track. A fresh account starts at level 1, 0 XP.
  xp_total integer not null default 0 check (xp_total >= 0),
  level integer not null default 1 check (level >= 1),
  updated_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null check (mode in ('interval', 'just-run', 'just-walk')),
  started_at timestamptz not null,
  duration_seconds integer not null check (duration_seconds >= 0),
  -- Null when GPS was unavailable. Distance is celebratory only, never a gate.
  distance_meters double precision check (distance_meters >= 0),
  off_plan boolean not null default false,
  created_at timestamptz not null default now(),
  -- Start time identifies a run, so a retried sync updates rather than
  -- duplicates it. This is what makes saveSessions idempotent.
  unique (user_id, started_at)
);

create index if not exists sessions_user_started_at_idx
  on public.sessions (user_id, started_at);

alter table public.profiles enable row level security;
alter table public.sessions enable row level security;

-- A user may read and write only their own rows. There is no cross-user
-- visibility anywhere in v1: the app has no social surface by design
-- (anti-elitism, DESIGN.md pillar 3).
drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Users read own sessions" on public.sessions;
create policy "Users read own sessions" on public.sessions
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users insert own sessions" on public.sessions;
create policy "Users insert own sessions" on public.sessions
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own sessions" on public.sessions;
create policy "Users update own sessions" on public.sessions
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
