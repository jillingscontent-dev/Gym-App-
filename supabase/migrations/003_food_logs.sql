-- Adds per-user food logging for the calorie tracker.
-- Safe to run after supabase/schema.sql. Re-running does not duplicate objects.
-- The source and metadata columns exist so photo, barcode, and AI-description
-- logging can be added later without a schema change.

create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  eaten_on date not null default (now()::date),
  name text not null,
  calories integer not null check (calories between 0 and 10000),
  protein_g numeric(6,1) check (protein_g between 0 and 1000),
  carbs_g numeric(6,1) check (carbs_g between 0 and 1000),
  fat_g numeric(6,1) check (fat_g between 0 and 1000),
  source text not null default 'manual'
    check (source in ('manual', 'photo', 'barcode', 'ai_text')),
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists food_logs_user_date_idx
  on public.food_logs(user_id, eaten_on desc);

drop trigger if exists food_logs_set_updated_at on public.food_logs;
create trigger food_logs_set_updated_at before update on public.food_logs
for each row execute function public.set_updated_at();

alter table public.food_logs enable row level security;

drop policy if exists "food_logs_owner_all" on public.food_logs;
create policy "food_logs_owner_all" on public.food_logs
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.food_logs to authenticated;
