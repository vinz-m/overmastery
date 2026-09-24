-- Bodyweight exercises now take an optional added load (a plate on push-ups,
-- a belt on pull-ups), stored in weight_kg like any other load. That makes
-- 'added_weight_reps' redundant, so its exercises and history fold into
-- 'bodyweight_reps' and the separate Weighted Pull-up merges into Pull-up.
--
-- The enum value stays: Postgres cannot drop one without rebuilding the type.
-- Check constraints below keep it from being used again.

update public.exercises
set tracking_type = 'bodyweight_reps'
where tracking_type = 'added_weight_reps';

update public.session_exercises
set tracking_type = 'bodyweight_reps'
where tracking_type = 'added_weight_reps';

do $$
declare
  weighted_id uuid;
  pull_up_id uuid;
begin
  select id into weighted_id
  from public.exercises
  where owner_user_id is null and slug = 'weighted-pull-up';

  select id into pull_up_id
  from public.exercises
  where owner_user_id is null and slug = 'pull-up';

  if weighted_id is null or pull_up_id is null then
    return;
  end if;

  -- A workout can hold an exercise once. Where a workout already has Pull-up,
  -- drop its Weighted Pull-up entry; sessions that came from it keep their
  -- history and just lose the link back to the template row.
  delete from public.workout_template_exercises weighted
  where weighted.exercise_id = weighted_id
    and exists (
      select 1
      from public.workout_template_exercises existing
      where existing.workout_template_id = weighted.workout_template_id
        and existing.exercise_id = pull_up_id
    );

  update public.workout_template_exercises
  set exercise_id = pull_up_id
  where exercise_id = weighted_id;

  update public.session_exercises
  set exercise_id = pull_up_id,
      exercise_name = 'Pull-up'
  where exercise_id = weighted_id;

  insert into public.exercise_aliases (exercise_id, alias)
  values (pull_up_id, 'Weighted Pull-up')
  on conflict do nothing;

  -- Muscles, equipment and aliases cascade.
  delete from public.exercises where id = weighted_id;
end;
$$;

alter table public.exercises
  add constraint exercises_tracking_type_not_retired
  check (tracking_type <> 'added_weight_reps');

alter table public.session_exercises
  add constraint session_exercises_tracking_type_not_retired
  check (tracking_type <> 'added_weight_reps');
