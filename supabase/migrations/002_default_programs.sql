-- Adds editable, per-user workout programs and seeds the complete five-day plan.
-- Safe to run after supabase/schema.sql. Re-running does not duplicate programs.

create table if not exists public.workout_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Hybrid PPL / Upper / Lower',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists one_active_program_per_user
  on public.workout_programs(user_id) where is_active;

create table if not exists public.program_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.workout_programs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  day_key text not null check (day_key in ('Push', 'Pull', 'Legs', 'Upper', 'Lower')),
  position integer not null,
  title text not null,
  focus text not null,
  duration_label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(program_id, day_key),
  unique(program_id, position)
);

create table if not exists public.program_exercises (
  id uuid primary key default gen_random_uuid(),
  program_day_id uuid not null references public.program_days(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  position integer not null,
  phase text not null check (phase in ('Power', 'Hypertrophy', 'Core / Athletic')),
  exercise_name text not null,
  target_sets integer not null check (target_sets between 1 and 10),
  target_reps text not null,
  rest_interval text not null,
  cue text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(program_day_id, position)
);

create index if not exists workout_programs_user_idx on public.workout_programs(user_id);
create index if not exists program_days_program_idx on public.program_days(program_id, position);
create index if not exists program_exercises_day_idx on public.program_exercises(program_day_id, position);

drop trigger if exists workout_programs_set_updated_at on public.workout_programs;
create trigger workout_programs_set_updated_at before update on public.workout_programs
for each row execute function public.set_updated_at();
drop trigger if exists program_days_set_updated_at on public.program_days;
create trigger program_days_set_updated_at before update on public.program_days
for each row execute function public.set_updated_at();
drop trigger if exists program_exercises_set_updated_at on public.program_exercises;
create trigger program_exercises_set_updated_at before update on public.program_exercises
for each row execute function public.set_updated_at();

alter table public.workout_programs enable row level security;
alter table public.program_days enable row level security;
alter table public.program_exercises enable row level security;

drop policy if exists "programs_owner_all" on public.workout_programs;
create policy "programs_owner_all" on public.workout_programs for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "program_days_owner_all" on public.program_days;
create policy "program_days_owner_all" on public.program_days for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "program_exercises_owner_all" on public.program_exercises;
create policy "program_exercises_owner_all" on public.program_exercises for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.workout_programs to authenticated;
grant select, insert, update, delete on public.program_days to authenticated;
grant select, insert, update, delete on public.program_exercises to authenticated;

create or replace function public.seed_default_program(target_user uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  program_uuid uuid;
  day_uuid uuid;
begin
  if (select auth.uid()) is not null and (select auth.uid()) <> target_user then
    raise exception 'Cannot seed a program for another user';
  end if;

  select id into program_uuid from public.workout_programs
  where user_id = target_user and is_active limit 1;
  if program_uuid is not null then return program_uuid; end if;

  insert into public.workout_programs (user_id, name)
  values (target_user, 'Hybrid PPL / Upper / Lower') returning id into program_uuid;

  insert into public.program_days (program_id,user_id,day_key,position,title,focus,duration_label)
  values (program_uuid,target_user,'Push',1,'Push','Chest, shoulders, triceps, rotational power and loaded trunk stability','70–85 min') returning id into day_uuid;
  insert into public.program_exercises (program_day_id,user_id,position,phase,exercise_name,target_sets,target_reps,rest_interval,cue) values
  (day_uuid,target_user,1,'Power','Rotational medicine-ball throw',3,'3–5 / side','60–90 sec','Stop if speed drops; crisp throws.'),
  (day_uuid,target_user,2,'Power','Plyometric push-up',3,'3–5','60–90 sec','Use an elevated surface if needed.'),
  (day_uuid,target_user,3,'Hypertrophy','Seated chest press',2,'8–12','2–3 min','Controlled lowering.'),
  (day_uuid,target_user,4,'Hypertrophy','Incline barbell press',2,'8–12','2–3 min','Leave 1–3 reps in reserve.'),
  (day_uuid,target_user,5,'Hypertrophy','Seated machine shoulder press',2,'8–12','2 min',''),
  (day_uuid,target_user,6,'Hypertrophy','Chest-supported dumbbell lateral raise',2,'12–20','60–90 sec',''),
  (day_uuid,target_user,7,'Hypertrophy','Rope triceps pushdown',2,'8–12','60–90 sec',''),
  (day_uuid,target_user,8,'Hypertrophy','Cable overhead triceps extension',2,'8–12','60–90 sec',''),
  (day_uuid,target_user,9,'Core / Athletic','Half-kneeling cable lift',2,'8–12 / side','60 sec','Resist extension; rotate through the upper trunk.'),
  (day_uuid,target_user,10,'Core / Athletic','Suitcase carry',3,'20–30 m / side','60–90 sec','Stay tall; do not lean toward the load.');

  insert into public.program_days (program_id,user_id,day_key,position,title,focus,duration_label)
  values (program_uuid,target_user,'Pull',2,'Pull','Back, biceps, upper-body power and loaded grip/trunk capacity','70–85 min') returning id into day_uuid;
  insert into public.program_exercises (program_day_id,user_id,position,phase,exercise_name,target_sets,target_reps,rest_interval,cue) values
  (day_uuid,target_user,1,'Power','Medicine-ball overhead slam',3,'3–5','60–90 sec','Max intent; reset each rep.'),
  (day_uuid,target_user,2,'Power','Explosive pull-up',3,'3–5','90–120 sec','Use band assistance if speed slows.'),
  (day_uuid,target_user,3,'Hypertrophy','Bent-over barbell row',2,'8–12','2–3 min',''),
  (day_uuid,target_user,4,'Hypertrophy','Lat-bar pulldown',2,'8–12','2 min',''),
  (day_uuid,target_user,5,'Hypertrophy','Single-arm kneeling dumbbell row',2,'8–12 / side','90–120 sec',''),
  (day_uuid,target_user,6,'Hypertrophy','Face pull',2,'12–20','60–90 sec',''),
  (day_uuid,target_user,7,'Hypertrophy','Preacher curl',2,'8–12','60–90 sec',''),
  (day_uuid,target_user,8,'Hypertrophy','Standing hammer curl',2,'8–12','60–90 sec',''),
  (day_uuid,target_user,9,'Core / Athletic','Hanging knee raise',3,'8–15','60–90 sec','Control the pelvis; avoid swinging.'),
  (day_uuid,target_user,10,'Core / Athletic','Farmer carry',3,'20–40 m','60–90 sec','Heavy, smooth steps; ribs stacked.');

  insert into public.program_days (program_id,user_id,day_key,position,title,focus,duration_label)
  values (program_uuid,target_user,'Legs',3,'Legs','Bilateral lower-body hypertrophy, jumping, sled work and weighted trunk flexion','80–95 min') returning id into day_uuid;
  insert into public.program_exercises (program_day_id,user_id,position,phase,exercise_name,target_sets,target_reps,rest_interval,cue) values
  (day_uuid,target_user,1,'Power','Countermovement box jump',3,'3–5','90–120 sec','Land quietly; step down.'),
  (day_uuid,target_user,2,'Power','Lateral bound with controlled landing',3,'3–5 / side','60–90 sec','Own each landing.'),
  (day_uuid,target_user,3,'Hypertrophy','Heel-elevated squat',2,'8–12','2.5–3 min',''),
  (day_uuid,target_user,4,'Hypertrophy','Romanian deadlift',2,'8–12','2.5–3 min',''),
  (day_uuid,target_user,5,'Hypertrophy','Barbell hip thrust',2,'8–12','2 min',''),
  (day_uuid,target_user,6,'Hypertrophy','Rear-foot-elevated split squat',2,'8–12 / leg','90–120 sec',''),
  (day_uuid,target_user,7,'Hypertrophy','Standing calf raise',2,'8–12','90 sec',''),
  (day_uuid,target_user,8,'Hypertrophy','Bent-knee calf raise',2,'12–20','60–90 sec',''),
  (day_uuid,target_user,9,'Core / Athletic','Heavy sled push',3,'15–25 m','90–120 sec','Drive the ground away; steady torso.'),
  (day_uuid,target_user,10,'Core / Athletic','Cable crunch',3,'10–15','60 sec','Flex through the trunk, not only the hips.'),
  (day_uuid,target_user,11,'Core / Athletic','Weighted dead bug pullover',2,'8–10 / side','60 sec','Keep the lower back gently braced.');

  insert into public.program_days (program_id,user_id,day_key,position,title,focus,duration_label)
  values (program_uuid,target_user,'Upper',4,'Upper','Balanced upper-body volume, rotation, pressing power and front-loaded carries','80–95 min') returning id into day_uuid;
  insert into public.program_exercises (program_day_id,user_id,position,phase,exercise_name,target_sets,target_reps,rest_interval,cue) values
  (day_uuid,target_user,1,'Power','Rotational medicine-ball scoop toss',3,'3–5 / side','60–90 sec','Rotate through hips and trunk.'),
  (day_uuid,target_user,2,'Power','Half-kneeling landmine push press',3,'4–6 / side','90–120 sec','Drive fast; reset each rep.'),
  (day_uuid,target_user,3,'Hypertrophy','Pull-up or chin-up',2,'6–10','2–3 min',''),
  (day_uuid,target_user,4,'Hypertrophy','Incline dumbbell bench press',2,'8–12','2–3 min',''),
  (day_uuid,target_user,5,'Hypertrophy','Chest-supported row',2,'8–12','2 min',''),
  (day_uuid,target_user,6,'Hypertrophy','Pec deck',2,'10–15','90 sec',''),
  (day_uuid,target_user,7,'Hypertrophy','Dumbbell lateral raise',2,'12–20','60–90 sec',''),
  (day_uuid,target_user,8,'Hypertrophy','Face pull with external rotation',2,'12–20','60–90 sec',''),
  (day_uuid,target_user,9,'Hypertrophy','Rope triceps pushdown',2,'10–15','60–90 sec',''),
  (day_uuid,target_user,10,'Hypertrophy','Incline dumbbell curl',2,'10–15','60–90 sec',''),
  (day_uuid,target_user,11,'Core / Athletic','Landmine rotation',3,'6–10 / side','60–90 sec','Rotate through hips and trunk as one unit.'),
  (day_uuid,target_user,12,'Core / Athletic','Front-rack carry',3,'20–30 m','60–90 sec','Use kettlebells or dumbbells; stay stacked.');

  insert into public.program_days (program_id,user_id,day_key,position,title,focus,duration_label)
  values (program_uuid,target_user,'Lower',5,'Lower','Unilateral and lateral lower-body work, sprint support, anti-rotation and trunk strength','80–95 min') returning id into day_uuid;
  insert into public.program_exercises (program_day_id,user_id,position,phase,exercise_name,target_sets,target_reps,rest_interval,cue) values
  (day_uuid,target_user,1,'Power','Standing broad jump',3,'3–5','90–120 sec','Stick the landing.'),
  (day_uuid,target_user,2,'Power','Split-stance jump',3,'3–5 / side','90 sec','Stop before jump height drops.'),
  (day_uuid,target_user,3,'Hypertrophy','Rear-foot-elevated split squat',2,'6–10 / side','2 min',''),
  (day_uuid,target_user,4,'Hypertrophy','Single-leg Romanian deadlift',2,'8–12 / side','90–120 sec',''),
  (day_uuid,target_user,5,'Hypertrophy','Lateral lunge or Cossack squat',2,'8–12 / side','90 sec',''),
  (day_uuid,target_user,6,'Hypertrophy','Seated or lying leg curl',2,'8–12','90 sec',''),
  (day_uuid,target_user,7,'Hypertrophy','Single-leg calf raise',2,'8–12 / side','60–90 sec',''),
  (day_uuid,target_user,8,'Core / Athletic','Dumbbell step-up',2,'6–10 / side','90 sec','Drive through the working leg; control down.'),
  (day_uuid,target_user,9,'Core / Athletic','Backward sled drag',3,'20–30 m','60–90 sec','Short, continuous steps.'),
  (day_uuid,target_user,10,'Core / Athletic','Copenhagen plank',2,'20–40 sec / side','60 sec','Enter seconds in the reps field.'),
  (day_uuid,target_user,11,'Core / Athletic','Pallof press, athletic stance',2,'8–12 / side','60 sec',''),
  (day_uuid,target_user,12,'Core / Athletic','Ab-wheel rollout',3,'6–12','60–90 sec','Only use range you can control without back sag.');

  return program_uuid;
end;
$$;

grant execute on function public.seed_default_program(uuid) to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  perform public.seed_default_program(new.id);
  return new;
end;
$$;

-- Backfill every existing account. The function is idempotent.
select public.seed_default_program(id) from auth.users;

