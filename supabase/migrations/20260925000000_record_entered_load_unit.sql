-- Gyms mix kg and lb equipment, so a set records the unit its load was typed
-- in. weight_kg / assistance_kg still always hold kilograms; this column only
-- lets the app show and prefill the load the way the user entered it.
alter table public.exercise_sets
  add column entered_unit public.unit_system;

comment on column public.exercise_sets.entered_unit is
  'Unit the load was entered in. Load columns always store kilograms; null means the profile default.';

-- Return the entered unit alongside the latest performance so the next session
-- starts in the unit that exercise was last logged in. The return type changes,
-- so the function is recreated rather than replaced.
drop function public.latest_exercise_performances(uuid[], timestamptz, uuid, uuid);

create function public.latest_exercise_performances(
  p_exercise_ids uuid[],
  p_ended_before timestamptz default null,
  p_exclude_session_id uuid default null,
  p_workout_template_id uuid default null
)
returns table (
  exercise_id uuid,
  load_kg numeric,
  load_unit public.unit_system,
  reps integer[]
)
language sql
stable
security invoker
set search_path = ''
as $$
  select distinct on (se.exercise_id)
    se.exercise_id,
    performance.load_kg,
    performance.load_unit,
    performance.reps
  from public.session_exercises se
  join public.training_sessions s on s.id = se.training_session_id
  cross join lateral (
    select
      (array_agg(
        case when se.tracking_type = 'assistance_reps' then es.assistance_kg else es.weight_kg end
        order by es.position
      ))[1] as load_kg,
      (array_agg(es.entered_unit order by es.position))[1] as load_unit,
      array_agg(es.reps order by es.position) as reps
    from public.exercise_sets es
    where es.session_exercise_id = se.id
      and es.status = 'completed'
      and es.reps is not null
  ) performance
  where se.exercise_id = any (p_exercise_ids)
    and s.user_id = (select auth.uid())
    and s.status = 'completed'
    and (p_ended_before is null or s.ended_at < p_ended_before)
    and (p_exclude_session_id is null or s.id <> p_exclude_session_id)
    and (p_workout_template_id is null or s.source_workout_template_id = p_workout_template_id)
    and performance.reps is not null
  order by se.exercise_id, s.ended_at desc, se.position desc;
$$;

revoke all on function public.latest_exercise_performances(uuid[], timestamptz, uuid, uuid) from public;
grant execute on function public.latest_exercise_performances(uuid[], timestamptz, uuid, uuid) to authenticated;
