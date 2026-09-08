-- Starter exercise catalog for the first workout-building slice.
-- Global exercises have no owner and are readable by every authenticated user.

insert into public.muscle_groups (slug, name)
values
  ('chest', 'Chest'),
  ('back', 'Back'),
  ('shoulders', 'Shoulders'),
  ('quadriceps', 'Quadriceps'),
  ('hamstrings', 'Hamstrings'),
  ('glutes', 'Glutes'),
  ('biceps', 'Biceps'),
  ('triceps', 'Triceps'),
  ('calves', 'Calves'),
  ('core', 'Core')
on conflict (slug) do nothing;

insert into public.equipment_types (slug, name)
values
  ('barbell', 'Barbell'),
  ('dumbbell', 'Dumbbell'),
  ('bodyweight', 'Bodyweight'),
  ('cable', 'Cable'),
  ('machine', 'Machine')
on conflict (slug) do nothing;

insert into public.exercises (
  owner_user_id,
  slug,
  name,
  tracking_type,
  movement_pattern
)
values
  (null, 'barbell-bench-press', 'Barbell Bench Press', 'weight_reps', 'horizontal_push'),
  (null, 'incline-dumbbell-press', 'Incline Dumbbell Press', 'weight_reps', 'horizontal_push'),
  (null, 'push-up', 'Push-up', 'bodyweight_reps', 'horizontal_push'),
  (null, 'barbell-back-squat', 'Barbell Back Squat', 'weight_reps', 'squat'),
  (null, 'leg-press', 'Leg Press', 'weight_reps', 'squat'),
  (null, 'leg-extension', 'Leg Extension', 'weight_reps', 'knee_extension'),
  (null, 'conventional-deadlift', 'Conventional Deadlift', 'weight_reps', 'hinge'),
  (null, 'romanian-deadlift', 'Romanian Deadlift', 'weight_reps', 'hinge'),
  (null, 'lying-leg-curl', 'Lying Leg Curl', 'weight_reps', 'knee_flexion'),
  (null, 'barbell-overhead-press', 'Barbell Overhead Press', 'weight_reps', 'vertical_push'),
  (null, 'dumbbell-lateral-raise', 'Dumbbell Lateral Raise', 'weight_reps', 'shoulder_abduction'),
  (null, 'barbell-row', 'Barbell Row', 'weight_reps', 'horizontal_pull'),
  (null, 'chest-supported-row', 'Chest-supported Row', 'weight_reps', 'horizontal_pull'),
  (null, 'seated-cable-row', 'Seated Cable Row', 'weight_reps', 'horizontal_pull'),
  (null, 'lat-pulldown', 'Lat Pulldown', 'weight_reps', 'vertical_pull'),
  (null, 'pull-up', 'Pull-up', 'bodyweight_reps', 'vertical_pull'),
  (null, 'weighted-pull-up', 'Weighted Pull-up', 'added_weight_reps', 'vertical_pull'),
  (null, 'assisted-pull-up', 'Assisted Pull-up', 'assistance_reps', 'vertical_pull'),
  (null, 'barbell-curl', 'Barbell Curl', 'weight_reps', 'elbow_flexion'),
  (null, 'dumbbell-curl', 'Dumbbell Curl', 'weight_reps', 'elbow_flexion'),
  (null, 'triceps-pushdown', 'Triceps Pushdown', 'weight_reps', 'elbow_extension'),
  (null, 'overhead-triceps-extension', 'Overhead Triceps Extension', 'weight_reps', 'elbow_extension'),
  (null, 'standing-calf-raise', 'Standing Calf Raise', 'weight_reps', 'plantar_flexion'),
  (null, 'seated-calf-raise', 'Seated Calf Raise', 'weight_reps', 'plantar_flexion'),
  (null, 'plank', 'Plank', 'duration', 'isometric_core')
on conflict do nothing;

with muscle_links (exercise_slug, muscle_slug, role, position) as (
  values
    ('barbell-bench-press', 'chest', 'primary'::public.muscle_role, 0),
    ('incline-dumbbell-press', 'chest', 'primary'::public.muscle_role, 0),
    ('push-up', 'chest', 'primary'::public.muscle_role, 0),
    ('barbell-back-squat', 'quadriceps', 'primary'::public.muscle_role, 0),
    ('barbell-back-squat', 'glutes', 'secondary'::public.muscle_role, 1),
    ('leg-press', 'quadriceps', 'primary'::public.muscle_role, 0),
    ('leg-extension', 'quadriceps', 'primary'::public.muscle_role, 0),
    ('conventional-deadlift', 'glutes', 'primary'::public.muscle_role, 0),
    ('conventional-deadlift', 'hamstrings', 'secondary'::public.muscle_role, 1),
    ('romanian-deadlift', 'hamstrings', 'primary'::public.muscle_role, 0),
    ('lying-leg-curl', 'hamstrings', 'primary'::public.muscle_role, 0),
    ('barbell-overhead-press', 'shoulders', 'primary'::public.muscle_role, 0),
    ('dumbbell-lateral-raise', 'shoulders', 'primary'::public.muscle_role, 0),
    ('barbell-row', 'back', 'primary'::public.muscle_role, 0),
    ('chest-supported-row', 'back', 'primary'::public.muscle_role, 0),
    ('seated-cable-row', 'back', 'primary'::public.muscle_role, 0),
    ('lat-pulldown', 'back', 'primary'::public.muscle_role, 0),
    ('pull-up', 'back', 'primary'::public.muscle_role, 0),
    ('weighted-pull-up', 'back', 'primary'::public.muscle_role, 0),
    ('assisted-pull-up', 'back', 'primary'::public.muscle_role, 0),
    ('barbell-curl', 'biceps', 'primary'::public.muscle_role, 0),
    ('dumbbell-curl', 'biceps', 'primary'::public.muscle_role, 0),
    ('triceps-pushdown', 'triceps', 'primary'::public.muscle_role, 0),
    ('overhead-triceps-extension', 'triceps', 'primary'::public.muscle_role, 0),
    ('standing-calf-raise', 'calves', 'primary'::public.muscle_role, 0),
    ('seated-calf-raise', 'calves', 'primary'::public.muscle_role, 0),
    ('plank', 'core', 'primary'::public.muscle_role, 0)
)
insert into public.exercise_muscles (exercise_id, muscle_group_id, role, position)
select e.id, mg.id, ml.role, ml.position
from muscle_links ml
join public.exercises e on e.slug = ml.exercise_slug and e.owner_user_id is null
join public.muscle_groups mg on mg.slug = ml.muscle_slug
on conflict (exercise_id, muscle_group_id) do nothing;

with equipment_links (exercise_slug, equipment_slug, position) as (
  values
    ('barbell-bench-press', 'barbell', 0),
    ('incline-dumbbell-press', 'dumbbell', 0),
    ('push-up', 'bodyweight', 0),
    ('barbell-back-squat', 'barbell', 0),
    ('leg-press', 'machine', 0),
    ('leg-extension', 'machine', 0),
    ('conventional-deadlift', 'barbell', 0),
    ('romanian-deadlift', 'barbell', 0),
    ('lying-leg-curl', 'machine', 0),
    ('barbell-overhead-press', 'barbell', 0),
    ('dumbbell-lateral-raise', 'dumbbell', 0),
    ('barbell-row', 'barbell', 0),
    ('chest-supported-row', 'dumbbell', 0),
    ('seated-cable-row', 'cable', 0),
    ('lat-pulldown', 'cable', 0),
    ('pull-up', 'bodyweight', 0),
    ('weighted-pull-up', 'bodyweight', 0),
    ('assisted-pull-up', 'machine', 0),
    ('barbell-curl', 'barbell', 0),
    ('dumbbell-curl', 'dumbbell', 0),
    ('triceps-pushdown', 'cable', 0),
    ('overhead-triceps-extension', 'cable', 0),
    ('standing-calf-raise', 'machine', 0),
    ('seated-calf-raise', 'machine', 0),
    ('plank', 'bodyweight', 0)
)
insert into public.exercise_equipment (exercise_id, equipment_type_id, position)
select e.id, et.id, el.position
from equipment_links el
join public.exercises e on e.slug = el.exercise_slug and e.owner_user_id is null
join public.equipment_types et on et.slug = el.equipment_slug
on conflict (exercise_id, equipment_type_id) do nothing;
