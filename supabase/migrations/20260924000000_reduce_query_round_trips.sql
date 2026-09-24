-- Keep session exercise status derived from its sets inside the database so
-- set mutations need one write instead of a write, a read, and a second write.
-- Mirrors exerciseStatusAfterSetChange in src/features/sessions/set-policy.ts.
create function public.sync_session_exercise_status()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_id uuid;
  next_status public.session_exercise_status;
begin
  target_id := case when tg_op = 'DELETE' then old.session_exercise_id else new.session_exercise_id end;

  select case
    when bool_or(es.status = 'completed') and not bool_or(es.status = 'planned')
      then 'completed'::public.session_exercise_status
    else 'planned'::public.session_exercise_status
  end
  into next_status
  from public.exercise_sets es
  where es.session_exercise_id = target_id;

  update public.session_exercises
  set status = next_status
  where id = target_id
    and status is distinct from next_status;

  return null;
end;
$$;

create trigger exercise_sets_sync_session_exercise_status
  after insert or delete or update of status on public.exercise_sets
  for each row execute function public.sync_session_exercise_status();

revoke all on function public.sync_session_exercise_status() from public;

-- Latest completed performance per exercise for the signed-in user, optionally
-- limited to sessions started from one workout template.
-- Replaces loading whole recent sessions just to find one result per exercise.
-- Mirrors the "previous performance" rule in sessions/data.ts and progress/data.ts:
-- completed sets with reps, ordered by position; load comes from the first set.
create function public.latest_exercise_performances(
  p_exercise_ids uuid[],
  p_ended_before timestamptz default null,
  p_exclude_session_id uuid default null,
  p_workout_template_id uuid default null
)
returns table (
  exercise_id uuid,
  load_kg numeric,
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
    performance.reps
  from public.session_exercises se
  join public.training_sessions s on s.id = se.training_session_id
  cross join lateral (
    select
      (array_agg(
        case when se.tracking_type = 'assistance_reps' then es.assistance_kg else es.weight_kg end
        order by es.position
      ))[1] as load_kg,
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

-- History reads filter completed sessions and sort by ended_at.
create index training_sessions_user_completed_ended_idx
  on public.training_sessions (user_id, ended_at desc)
  where status = 'completed';
