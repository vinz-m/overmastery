-- 1. Snapshot plan targets onto each session exercise.
--
-- Sessions already snapshot the exercise name and tracking type so later plan
-- edits can't rewrite history (ADR 0001). Targets were still read live through
-- source_template_exercise_id, so editing a plan changed past sessions, and
-- because a plan save re-creates its rows, the link (and the targets) vanished.
alter table public.session_exercises
  add column target_sets smallint check (target_sets is null or target_sets between 1 and 20),
  add column target_rep_min smallint check (target_rep_min is null or target_rep_min >= 0),
  add column target_rep_max smallint check (target_rep_max is null or target_rep_max >= 0),
  add column default_rest_seconds integer check (default_rest_seconds is null or default_rest_seconds >= 0);

comment on column public.session_exercises.target_sets is
  'Planned set count copied from the workout template when the session started. Null for sessions started before snapshots or without a template.';

-- Backfill every session whose template link still exists.
update public.session_exercises se
set
  target_sets = wte.target_sets,
  target_rep_min = wte.target_rep_min,
  target_rep_max = wte.target_rep_max,
  default_rest_seconds = wte.default_rest_seconds
from public.workout_template_exercises wte
where wte.id = se.source_template_exercise_id
  and se.target_sets is null;

-- 2. Finish a session in one transaction.
--
-- Closes open sets as skipped, settles each exercise as completed or skipped,
-- and completes the session. Previously this took several separate requests,
-- so a dropped connection could leave a session half-finished.
-- Returns 'finished', 'not_active' or 'no_sets'.
create function public.finish_session(p_session_id uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  session_id uuid;
begin
  select s.id into session_id
  from public.training_sessions s
  where s.id = p_session_id
    and s.user_id = (select auth.uid())
    and s.status = 'active'
  for update;

  if session_id is null then
    return 'not_active';
  end if;

  if not exists (
    select 1
    from public.exercise_sets es
    join public.session_exercises se on se.id = es.session_exercise_id
    where se.training_session_id = session_id
      and es.status = 'completed'
  ) then
    return 'no_sets';
  end if;

  update public.exercise_sets es
  set status = 'skipped'
  from public.session_exercises se
  where se.id = es.session_exercise_id
    and se.training_session_id = session_id
    and es.status = 'planned';

  -- After the set trigger has run: settle every exercise explicitly.
  update public.session_exercises se
  set status = case
    when exists (
      select 1 from public.exercise_sets es
      where es.session_exercise_id = se.id and es.status = 'completed'
    ) then 'completed'::public.session_exercise_status
    else 'skipped'::public.session_exercise_status
  end
  where se.training_session_id = session_id;

  update public.training_sessions
  set status = 'completed', ended_at = now()
  where id = session_id;

  return 'finished';
end;
$$;

revoke all on function public.finish_session(uuid) from public;
grant execute on function public.finish_session(uuid) to authenticated;
