-- Expand the global exercise catalog with common strength-training movements.
-- This migration is intentionally data-only and safe to rerun.

insert into public.muscle_groups (slug, name)
values
  ('forearms', 'Forearms'),
  ('traps', 'Traps')
on conflict (slug) do nothing;

insert into public.exercises (
  owner_user_id,
  slug,
  name,
  tracking_type,
  movement_pattern,
  is_unilateral
)
values
  (null, 'dumbbell-bench-press', 'Dumbbell Bench Press', 'weight_reps', 'horizontal_push', false),
  (null, 'incline-barbell-bench-press', 'Incline Barbell Bench Press', 'weight_reps', 'horizontal_push', false),
  (null, 'machine-chest-press', 'Machine Chest Press', 'weight_reps', 'horizontal_push', false),
  (null, 'cable-chest-fly', 'Cable Chest Fly', 'weight_reps', 'horizontal_adduction', false),
  (null, 'pec-deck', 'Pec Deck', 'weight_reps', 'horizontal_adduction', false),
  (null, 'chest-dip', 'Chest Dip', 'bodyweight_reps', 'vertical_push', false),
  (null, 'one-arm-dumbbell-row', 'One-arm Dumbbell Row', 'weight_reps', 'horizontal_pull', true),
  (null, 't-bar-row', 'T-Bar Row', 'weight_reps', 'horizontal_pull', false),
  (null, 'machine-row', 'Machine Row', 'weight_reps', 'horizontal_pull', false),
  (null, 'neutral-grip-lat-pulldown', 'Neutral-grip Lat Pulldown', 'weight_reps', 'vertical_pull', false),
  (null, 'straight-arm-pulldown', 'Straight-arm Pulldown', 'weight_reps', 'shoulder_extension', false),
  (null, 'dumbbell-pullover', 'Dumbbell Pullover', 'weight_reps', 'shoulder_extension', false),
  (null, 'dumbbell-shoulder-press', 'Dumbbell Shoulder Press', 'weight_reps', 'vertical_push', false),
  (null, 'machine-shoulder-press', 'Machine Shoulder Press', 'weight_reps', 'vertical_push', false),
  (null, 'arnold-press', 'Arnold Press', 'weight_reps', 'vertical_push', false),
  (null, 'cable-lateral-raise', 'Cable Lateral Raise', 'weight_reps', 'shoulder_abduction', true),
  (null, 'reverse-pec-deck', 'Reverse Pec Deck', 'weight_reps', 'horizontal_abduction', false),
  (null, 'face-pull', 'Face Pull', 'weight_reps', 'horizontal_pull', false),
  (null, 'front-squat', 'Front Squat', 'weight_reps', 'squat', false),
  (null, 'hack-squat', 'Hack Squat', 'weight_reps', 'squat', false),
  (null, 'goblet-squat', 'Goblet Squat', 'weight_reps', 'squat', false),
  (null, 'bulgarian-split-squat', 'Bulgarian Split Squat', 'weight_reps', 'lunge', true),
  (null, 'smith-machine-squat', 'Smith Machine Squat', 'weight_reps', 'squat', false),
  (null, 'seated-leg-curl', 'Seated Leg Curl', 'weight_reps', 'knee_flexion', false),
  (null, 'good-morning', 'Good Morning', 'weight_reps', 'hinge', false),
  (null, 'single-leg-romanian-deadlift', 'Single-leg Romanian Deadlift', 'weight_reps', 'hinge', true),
  (null, 'barbell-hip-thrust', 'Barbell Hip Thrust', 'weight_reps', 'hip_extension', false),
  (null, 'glute-bridge', 'Glute Bridge', 'bodyweight_reps', 'hip_extension', false),
  (null, 'cable-glute-kickback', 'Cable Glute Kickback', 'weight_reps', 'hip_extension', true),
  (null, 'hammer-curl', 'Hammer Curl', 'weight_reps', 'elbow_flexion', false),
  (null, 'incline-dumbbell-curl', 'Incline Dumbbell Curl', 'weight_reps', 'elbow_flexion', false),
  (null, 'preacher-curl', 'Preacher Curl', 'weight_reps', 'elbow_flexion', false),
  (null, 'cable-curl', 'Cable Curl', 'weight_reps', 'elbow_flexion', false),
  (null, 'close-grip-bench-press', 'Close-grip Bench Press', 'weight_reps', 'horizontal_push', false),
  (null, 'skull-crusher', 'Skull Crusher', 'weight_reps', 'elbow_extension', false),
  (null, 'dumbbell-triceps-kickback', 'Dumbbell Triceps Kickback', 'weight_reps', 'elbow_extension', true),
  (null, 'leg-press-calf-raise', 'Leg Press Calf Raise', 'weight_reps', 'plantar_flexion', false),
  (null, 'crunch', 'Crunch', 'bodyweight_reps', 'spinal_flexion', false),
  (null, 'cable-crunch', 'Cable Crunch', 'weight_reps', 'spinal_flexion', false),
  (null, 'hanging-leg-raise', 'Hanging Leg Raise', 'bodyweight_reps', 'hip_flexion', false),
  (null, 'ab-wheel-rollout', 'Ab Wheel Rollout', 'bodyweight_reps', 'anti_extension', false),
  (null, 'russian-twist', 'Russian Twist', 'weight_reps', 'rotation', false),
  (null, 'barbell-shrug', 'Barbell Shrug', 'weight_reps', 'scapular_elevation', false),
  (null, 'dumbbell-shrug', 'Dumbbell Shrug', 'weight_reps', 'scapular_elevation', false),
  (null, 'wrist-curl', 'Wrist Curl', 'weight_reps', 'wrist_flexion', false),
  (null, 'reverse-wrist-curl', 'Reverse Wrist Curl', 'weight_reps', 'wrist_extension', false)
on conflict do nothing;

with muscle_links (exercise_slug, muscle_slug, role, position) as (
  values
    ('dumbbell-bench-press', 'chest', 'primary'::public.muscle_role, 0),
    ('incline-barbell-bench-press', 'chest', 'primary'::public.muscle_role, 0),
    ('machine-chest-press', 'chest', 'primary'::public.muscle_role, 0),
    ('cable-chest-fly', 'chest', 'primary'::public.muscle_role, 0),
    ('pec-deck', 'chest', 'primary'::public.muscle_role, 0),
    ('chest-dip', 'chest', 'primary'::public.muscle_role, 0),
    ('chest-dip', 'triceps', 'secondary'::public.muscle_role, 1),
    ('one-arm-dumbbell-row', 'back', 'primary'::public.muscle_role, 0),
    ('t-bar-row', 'back', 'primary'::public.muscle_role, 0),
    ('machine-row', 'back', 'primary'::public.muscle_role, 0),
    ('neutral-grip-lat-pulldown', 'back', 'primary'::public.muscle_role, 0),
    ('straight-arm-pulldown', 'back', 'primary'::public.muscle_role, 0),
    ('dumbbell-pullover', 'back', 'primary'::public.muscle_role, 0),
    ('dumbbell-shoulder-press', 'shoulders', 'primary'::public.muscle_role, 0),
    ('machine-shoulder-press', 'shoulders', 'primary'::public.muscle_role, 0),
    ('arnold-press', 'shoulders', 'primary'::public.muscle_role, 0),
    ('cable-lateral-raise', 'shoulders', 'primary'::public.muscle_role, 0),
    ('reverse-pec-deck', 'shoulders', 'primary'::public.muscle_role, 0),
    ('face-pull', 'shoulders', 'primary'::public.muscle_role, 0),
    ('front-squat', 'quadriceps', 'primary'::public.muscle_role, 0),
    ('front-squat', 'glutes', 'secondary'::public.muscle_role, 1),
    ('hack-squat', 'quadriceps', 'primary'::public.muscle_role, 0),
    ('goblet-squat', 'quadriceps', 'primary'::public.muscle_role, 0),
    ('bulgarian-split-squat', 'quadriceps', 'primary'::public.muscle_role, 0),
    ('bulgarian-split-squat', 'glutes', 'secondary'::public.muscle_role, 1),
    ('smith-machine-squat', 'quadriceps', 'primary'::public.muscle_role, 0),
    ('seated-leg-curl', 'hamstrings', 'primary'::public.muscle_role, 0),
    ('good-morning', 'hamstrings', 'primary'::public.muscle_role, 0),
    ('good-morning', 'glutes', 'secondary'::public.muscle_role, 1),
    ('single-leg-romanian-deadlift', 'hamstrings', 'primary'::public.muscle_role, 0),
    ('single-leg-romanian-deadlift', 'glutes', 'secondary'::public.muscle_role, 1),
    ('barbell-hip-thrust', 'glutes', 'primary'::public.muscle_role, 0),
    ('glute-bridge', 'glutes', 'primary'::public.muscle_role, 0),
    ('cable-glute-kickback', 'glutes', 'primary'::public.muscle_role, 0),
    ('hammer-curl', 'biceps', 'primary'::public.muscle_role, 0),
    ('hammer-curl', 'forearms', 'secondary'::public.muscle_role, 1),
    ('incline-dumbbell-curl', 'biceps', 'primary'::public.muscle_role, 0),
    ('preacher-curl', 'biceps', 'primary'::public.muscle_role, 0),
    ('cable-curl', 'biceps', 'primary'::public.muscle_role, 0),
    ('close-grip-bench-press', 'triceps', 'primary'::public.muscle_role, 0),
    ('close-grip-bench-press', 'chest', 'secondary'::public.muscle_role, 1),
    ('skull-crusher', 'triceps', 'primary'::public.muscle_role, 0),
    ('dumbbell-triceps-kickback', 'triceps', 'primary'::public.muscle_role, 0),
    ('leg-press-calf-raise', 'calves', 'primary'::public.muscle_role, 0),
    ('crunch', 'core', 'primary'::public.muscle_role, 0),
    ('cable-crunch', 'core', 'primary'::public.muscle_role, 0),
    ('hanging-leg-raise', 'core', 'primary'::public.muscle_role, 0),
    ('ab-wheel-rollout', 'core', 'primary'::public.muscle_role, 0),
    ('russian-twist', 'core', 'primary'::public.muscle_role, 0),
    ('barbell-shrug', 'traps', 'primary'::public.muscle_role, 0),
    ('dumbbell-shrug', 'traps', 'primary'::public.muscle_role, 0),
    ('wrist-curl', 'forearms', 'primary'::public.muscle_role, 0),
    ('reverse-wrist-curl', 'forearms', 'primary'::public.muscle_role, 0)
)
insert into public.exercise_muscles (exercise_id, muscle_group_id, role, position)
select e.id, mg.id, ml.role, ml.position
from muscle_links ml
join public.exercises e on e.slug = ml.exercise_slug and e.owner_user_id is null
join public.muscle_groups mg on mg.slug = ml.muscle_slug
on conflict (exercise_id, muscle_group_id) do nothing;

with equipment_links (exercise_slug, equipment_slug, position) as (
  values
    ('dumbbell-bench-press', 'dumbbell', 0),
    ('incline-barbell-bench-press', 'barbell', 0),
    ('machine-chest-press', 'machine', 0),
    ('cable-chest-fly', 'cable', 0),
    ('pec-deck', 'machine', 0),
    ('chest-dip', 'bodyweight', 0),
    ('one-arm-dumbbell-row', 'dumbbell', 0),
    ('t-bar-row', 'barbell', 0),
    ('machine-row', 'machine', 0),
    ('neutral-grip-lat-pulldown', 'cable', 0),
    ('straight-arm-pulldown', 'cable', 0),
    ('dumbbell-pullover', 'dumbbell', 0),
    ('dumbbell-shoulder-press', 'dumbbell', 0),
    ('machine-shoulder-press', 'machine', 0),
    ('arnold-press', 'dumbbell', 0),
    ('cable-lateral-raise', 'cable', 0),
    ('reverse-pec-deck', 'machine', 0),
    ('face-pull', 'cable', 0),
    ('front-squat', 'barbell', 0),
    ('hack-squat', 'machine', 0),
    ('goblet-squat', 'dumbbell', 0),
    ('bulgarian-split-squat', 'dumbbell', 0),
    ('smith-machine-squat', 'machine', 0),
    ('seated-leg-curl', 'machine', 0),
    ('good-morning', 'barbell', 0),
    ('single-leg-romanian-deadlift', 'dumbbell', 0),
    ('barbell-hip-thrust', 'barbell', 0),
    ('glute-bridge', 'bodyweight', 0),
    ('cable-glute-kickback', 'cable', 0),
    ('hammer-curl', 'dumbbell', 0),
    ('incline-dumbbell-curl', 'dumbbell', 0),
    ('preacher-curl', 'barbell', 0),
    ('cable-curl', 'cable', 0),
    ('close-grip-bench-press', 'barbell', 0),
    ('skull-crusher', 'barbell', 0),
    ('dumbbell-triceps-kickback', 'dumbbell', 0),
    ('leg-press-calf-raise', 'machine', 0),
    ('crunch', 'bodyweight', 0),
    ('cable-crunch', 'cable', 0),
    ('hanging-leg-raise', 'bodyweight', 0),
    ('ab-wheel-rollout', 'bodyweight', 0),
    ('russian-twist', 'dumbbell', 0),
    ('barbell-shrug', 'barbell', 0),
    ('dumbbell-shrug', 'dumbbell', 0),
    ('wrist-curl', 'dumbbell', 0),
    ('reverse-wrist-curl', 'dumbbell', 0)
)
insert into public.exercise_equipment (exercise_id, equipment_type_id, position)
select e.id, et.id, el.position
from equipment_links el
join public.exercises e on e.slug = el.exercise_slug and e.owner_user_id is null
join public.equipment_types et on et.slug = el.equipment_slug
on conflict (exercise_id, equipment_type_id) do nothing;
