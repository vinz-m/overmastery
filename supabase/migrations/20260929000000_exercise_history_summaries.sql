-- One row per exercise the signed-in user has ever completed, for the
-- Progress exercise list. Counting in the database keeps the list complete and
-- its "logged N times" accurate however long the history gets, instead of
-- deriving both from the most recent sessions only.
--
-- An exposure is a completed session in which the exercise has at least one
-- completed set with reps, matching how the app builds history.
create function public.exercise_history_summaries()
returns table (
  exercise_id uuid,
  exercise_name text,
  tracking_type public.exercise_tracking_type,
  exposure_count integer,
  last_ended_at timestamptz,
  is_custom boolean,
  primary_muscle_name text,
  primary_muscle_slug text
)
language sql
stable
security invoker
set search_path = ''
as $$
  with exposures as (
    select
      se.exercise_id,
      se.exercise_name,
      se.tracking_type,
      s.id as session_id,
      s.ended_at
    from public.session_exercises se
    join public.training_sessions s on s.id = se.training_session_id
    where s.user_id = (select auth.uid())
      and s.status = 'completed'
      and se.exercise_id is not null
      and exists (
        select 1
        from public.exercise_sets es
        where es.session_exercise_id = se.id
          and es.status = 'completed'
          and es.reps is not null
      )
  ),
  counts as (
    select
      exercise_id,
      count(distinct session_id)::integer as exposure_count,
      max(ended_at) as last_ended_at
    from exposures
    group by exercise_id
  ),
  -- Sessions snapshot the name, so show it as it was last trained.
  latest as (
    select distinct on (exercise_id)
      exercise_id,
      exercise_name,
      tracking_type
    from exposures
    order by exercise_id, ended_at desc
  )
  select
    latest.exercise_id,
    latest.exercise_name,
    latest.tracking_type,
    counts.exposure_count,
    counts.last_ended_at,
    coalesce(e.owner_user_id is not null, false) as is_custom,
    primary_muscle.name as primary_muscle_name,
    primary_muscle.slug as primary_muscle_slug
  from latest
  join counts on counts.exercise_id = latest.exercise_id
  left join public.exercises e on e.id = latest.exercise_id
  left join lateral (
    select mg.name, mg.slug
    from public.exercise_muscles em
    join public.muscle_groups mg on mg.id = em.muscle_group_id
    where em.exercise_id = latest.exercise_id
      and em.role = 'primary'
    order by em.position
    limit 1
  ) primary_muscle on true
  order by counts.last_ended_at desc;
$$;

revoke all on function public.exercise_history_summaries() from public;
grant execute on function public.exercise_history_summaries() to authenticated;
