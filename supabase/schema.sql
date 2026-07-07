-- TRAIN fitness logbook schema
-- Run this once in Supabase Dashboard → SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Athlete',
  body_weight_kg numeric(6,2),
  preferred_units text not null default 'kg' check (preferred_units in ('kg', 'lb')),
  reminders_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_key text not null check (workout_key in ('Push', 'Pull', 'Legs', 'Upper', 'Lower')),
  status text not null default 'active' check (status in ('active', 'completed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_minutes integer,
  body_weight_kg numeric(6,2),
  total_volume_kg numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists one_active_workout_per_user
  on public.workout_sessions(user_id) where status = 'active';
create index if not exists workout_sessions_user_date_idx
  on public.workout_sessions(user_id, started_at desc);

create table if not exists public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  position integer not null,
  phase text not null,
  exercise_name text not null,
  target_sets integer not null,
  target_reps text not null,
  rest_interval text not null,
  cue text,
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique(session_id, position)
);

create index if not exists exercise_logs_session_idx on public.exercise_logs(session_id, position);

create table if not exists public.set_logs (
  id uuid primary key default gen_random_uuid(),
  exercise_log_id uuid not null references public.exercise_logs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  set_number integer not null,
  weight_kg numeric(8,2),
  reps numeric(8,2),
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(exercise_log_id, set_number)
);

create index if not exists set_logs_exercise_idx on public.set_logs(exercise_log_id, set_number);

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists sessions_set_updated_at on public.workout_sessions;
create trigger sessions_set_updated_at before update on public.workout_sessions
for each row execute function public.set_updated_at();

drop trigger if exists sets_set_updated_at on public.set_logs;
create trigger sets_set_updated_at before update on public.set_logs
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.exercise_logs enable row level security;
alter table public.set_logs enable row level security;

drop policy if exists "profiles_owner_all" on public.profiles;
create policy "profiles_owner_all" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "sessions_owner_all" on public.workout_sessions;
create policy "sessions_owner_all" on public.workout_sessions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "exercises_owner_all" on public.exercise_logs;
create policy "exercises_owner_all" on public.exercise_logs
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "sets_owner_all" on public.set_logs;
create policy "sets_owner_all" on public.set_logs
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.workout_sessions to authenticated;
grant select, insert, update, delete on public.exercise_logs to authenticated;
grant select, insert, update, delete on public.set_logs to authenticated;

