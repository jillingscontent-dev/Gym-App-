-- Adds six-meal-slot tracking, meal time, and photo attachments to food logs.
-- Safe to run after 003_food_logs.sql. Re-running does not duplicate objects.

alter table public.food_logs
  add column if not exists meal_slot integer check (meal_slot between 1 and 6);
alter table public.food_logs
  add column if not exists eaten_time time;
alter table public.food_logs
  add column if not exists photo_path text;

-- Private bucket for meal photos. Users may only touch objects inside a
-- folder named after their own user id, e.g. <user-id>/<meal-id>.jpg.
insert into storage.buckets (id, name, public)
values ('meal-photos', 'meal-photos', false)
on conflict (id) do nothing;

drop policy if exists "meal_photos_owner_select" on storage.objects;
create policy "meal_photos_owner_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "meal_photos_owner_insert" on storage.objects;
create policy "meal_photos_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "meal_photos_owner_update" on storage.objects;
create policy "meal_photos_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "meal_photos_owner_delete" on storage.objects;
create policy "meal_photos_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
