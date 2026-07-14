-- Adds post-session progress photos.
-- Safe to run after supabase/schema.sql. Re-running does not duplicate objects.

create table if not exists public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.workout_sessions(id) on delete set null,
  taken_on date not null default (now()::date),
  photo_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists progress_photos_user_date_idx
  on public.progress_photos(user_id, taken_on desc);

alter table public.progress_photos enable row level security;

drop policy if exists "progress_photos_owner_all" on public.progress_photos;
create policy "progress_photos_owner_all" on public.progress_photos
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.progress_photos to authenticated;

-- Private bucket; users may only touch objects inside their own user-id folder.
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

drop policy if exists "progress_photos_storage_select" on storage.objects;
create policy "progress_photos_storage_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "progress_photos_storage_insert" on storage.objects;
create policy "progress_photos_storage_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "progress_photos_storage_delete" on storage.objects;
create policy "progress_photos_storage_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
