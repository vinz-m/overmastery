-- Overmastery initial schema.
-- This migration is designed for Supabase Postgres and has not been applied.

create extension if not exists pg_trgm with schema extensions;

create type public.unit_system as enum ('metric', 'imperial');
create type public.exercise_tracking_type as enum (
  'weight_reps',
  'bodyweight_reps',
  'added_weight_reps',
  'assistance_reps',
  'duration',
  'weight_distance',
  'weight_duration'
);
create type public.muscle_role as enum ('primary', 'secondary');
create type public.session_status as enum ('active', 'completed', 'abandoned');
create type public.session_exercise_status as enum ('planned', 'completed', 'skipped');
create type public.set_status as enum ('planned', 'completed', 'skipped');
create type public.set_kind as enum ('working', 'warmup');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 80),
  unit_system public.unit_system not null default 'metric',
  time_zone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.muscle_groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug = lower(slug)),
  name text not null unique check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now()
);

create table public.equipment_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug = lower(slug)),
  name text not null unique check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now()
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users (id) on delete cascade,
  slug text,
  name text not null check (char_length(name) between 1 and 120),
  tracking_type public.exercise_tracking_type not null default 'weight_reps',
  movement_pattern text check (movement_pattern is null or char_length(movement_pattern) <= 80),
  is_unilateral boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint global_exercise_requires_slug check (
    (owner_user_id is null and slug is not null and slug = lower(slug))
    or owner_user_id is not null
  )
);

create unique index exercises_global_slug_key
  on public.exercises (slug)
  where owner_user_id is null;
create unique index exercises_global_name_key
  on public.exercises (lower(name))
  where owner_user_id is null and archived_at is null;
create unique index exercises_custom_name_key
  on public.exercises (owner_user_id, lower(name))
  where owner_user_id is not null and archived_at is null;
create index exercises_owner_user_id_idx on public.exercises (owner_user_id);
create index exercises_name_trgm_idx
  on public.exercises using gin (lower(name) extensions.gin_trgm_ops);

create table public.exercise_aliases (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  alias text not null check (char_length(alias) between 1 and 120),
  created_at timestamptz not null default now()
);

create unique index exercise_aliases_exercise_alias_key
  on public.exercise_aliases (exercise_id, lower(alias));
create index exercise_aliases_exercise_id_idx on public.exercise_aliases (exercise_id);
create index exercise_aliases_alias_trgm_idx
  on public.exercise_aliases using gin (lower(alias) extensions.gin_trgm_ops);

create table public.exercise_muscles (
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  muscle_group_id uuid not null references public.muscle_groups (id) on delete restrict,
  role public.muscle_role not null,
  position smallint not null default 0 check (position >= 0),
  primary key (exercise_id, muscle_group_id)
);

create index exercise_muscles_muscle_group_id_idx
  on public.exercise_muscles (muscle_group_id);

create table public.exercise_equipment (
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  equipment_type_id uuid not null references public.equipment_types (id) on delete restrict,
  position smallint not null default 0 check (position >= 0),
  primary key (exercise_id, equipment_type_id)
);

create index exercise_equipment_equipment_type_id_idx
  on public.exercise_equipment (equipment_type_id);

create table public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  notes text check (notes is null or char_length(notes) <= 2000),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index workout_templates_user_name_key
  on public.workout_templates (user_id, lower(name))
  where archived_at is null;
create index workout_templates_user_id_idx on public.workout_templates (user_id);

create table public.workout_template_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_template_id uuid not null references public.workout_templates (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  position integer not null check (position >= 0),
  target_sets smallint not null default 3 check (target_sets between 1 and 20),
  target_rep_min smallint check (target_rep_min is null or target_rep_min >= 0),
  target_rep_max smallint check (target_rep_max is null or target_rep_max >= 0),
  default_rest_seconds integer check (default_rest_seconds is null or default_rest_seconds >= 0),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint template_rep_range_is_valid check (
    target_rep_min is null or target_rep_max is null or target_rep_min <= target_rep_max
  ),
  constraint workout_template_exercises_position_key
    unique (workout_template_id, position) deferrable initially immediate,
  constraint workout_template_exercises_exercise_key
    unique (workout_template_id, exercise_id) deferrable initially immediate
);

create index workout_template_exercises_template_id_idx
  on public.workout_template_exercises (workout_template_id);
create index workout_template_exercises_exercise_id_idx
  on public.workout_template_exercises (exercise_id);

create table public.training_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'Weekly schedule' check (char_length(name) between 1 and 120),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index training_schedules_one_active_per_user
  on public.training_schedules (user_id)
  where is_active;
create index training_schedules_user_id_idx on public.training_schedules (user_id);

create table public.schedule_slots (
  id uuid primary key default gen_random_uuid(),
  training_schedule_id uuid not null references public.training_schedules (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  position smallint not null default 0 check (position >= 0),
  workout_template_id uuid references public.workout_templates (id) on delete set null,
  label text check (label is null or char_length(label) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_slots_position_key
    unique (training_schedule_id, weekday, position) deferrable initially immediate
);

create index schedule_slots_schedule_id_idx
  on public.schedule_slots (training_schedule_id);
create index schedule_slots_template_id_idx
  on public.schedule_slots (workout_template_id);

create table public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_workout_template_id uuid references public.workout_templates (id) on delete set null,
  source_schedule_slot_id uuid references public.schedule_slots (id) on delete set null,
  template_name text check (template_name is null or char_length(template_name) between 1 and 120),
  planned_for date,
  status public.session_status not null default 'active',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  notes text check (notes is null or char_length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint session_end_matches_status check (
    (status = 'active' and ended_at is null)
    or (status <> 'active' and ended_at is not null)
  )
);

create unique index training_sessions_one_active_per_user
  on public.training_sessions (user_id)
  where status = 'active';
create index training_sessions_user_started_idx
  on public.training_sessions (user_id, started_at desc);
create index training_sessions_template_id_idx
  on public.training_sessions (source_workout_template_id);
create index training_sessions_schedule_slot_id_idx
  on public.training_sessions (source_schedule_slot_id);

create table public.session_exercises (
  id uuid primary key default gen_random_uuid(),
  training_session_id uuid not null references public.training_sessions (id) on delete cascade,
  exercise_id uuid references public.exercises (id) on delete set null,
  source_template_exercise_id uuid references public.workout_template_exercises (id) on delete set null,
  position integer not null check (position >= 0),
  exercise_name text not null check (char_length(exercise_name) between 1 and 120),
  tracking_type public.exercise_tracking_type not null,
  is_unilateral boolean not null default false,
  status public.session_exercise_status not null default 'planned',
  notes text check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint session_exercises_position_key
    unique (training_session_id, position) deferrable initially immediate
);

create index session_exercises_session_id_idx
  on public.session_exercises (training_session_id);
create index session_exercises_exercise_id_idx
  on public.session_exercises (exercise_id);
create index session_exercises_history_idx
  on public.session_exercises (exercise_id, training_session_id)
  where exercise_id is not null;

create table public.exercise_sets (
  id uuid primary key default gen_random_uuid(),
  session_exercise_id uuid not null references public.session_exercises (id) on delete cascade,
  position integer not null check (position >= 0),
  kind public.set_kind not null default 'working',
  status public.set_status not null default 'planned',
  planned_weight_kg numeric(8, 3) check (planned_weight_kg is null or planned_weight_kg >= 0),
  planned_reps integer check (planned_reps is null or planned_reps >= 0),
  weight_kg numeric(8, 3) check (weight_kg is null or weight_kg >= 0),
  reps integer check (reps is null or reps >= 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  distance_meters numeric(10, 3) check (distance_meters is null or distance_meters >= 0),
  assistance_kg numeric(8, 3) check (assistance_kg is null or assistance_kg >= 0),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint completed_set_has_measurement check (
    status <> 'completed'
    or weight_kg is not null
    or reps is not null
    or duration_seconds is not null
    or distance_meters is not null
    or assistance_kg is not null
  ),
  constraint set_completion_time_matches_status check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  ),
  constraint exercise_sets_position_key
    unique (session_exercise_id, position) deferrable initially immediate
);

create index exercise_sets_session_exercise_id_idx
  on public.exercise_sets (session_exercise_id);
create index exercise_sets_completed_working_idx
  on public.exercise_sets (session_exercise_id, position)
  where status = 'completed' and kind = 'working';

-- Keep mutable records' timestamps consistent.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger exercises_set_updated_at
  before update on public.exercises
  for each row execute function public.set_updated_at();
create trigger workout_templates_set_updated_at
  before update on public.workout_templates
  for each row execute function public.set_updated_at();
create trigger workout_template_exercises_set_updated_at
  before update on public.workout_template_exercises
  for each row execute function public.set_updated_at();
create trigger training_schedules_set_updated_at
  before update on public.training_schedules
  for each row execute function public.set_updated_at();
create trigger schedule_slots_set_updated_at
  before update on public.schedule_slots
  for each row execute function public.set_updated_at();
create trigger training_sessions_set_updated_at
  before update on public.training_sessions
  for each row execute function public.set_updated_at();
create trigger session_exercises_set_updated_at
  before update on public.session_exercises
  for each row execute function public.set_updated_at();
create trigger exercise_sets_set_updated_at
  before update on public.exercise_sets
  for each row execute function public.set_updated_at();

-- Mirror the minimal application profile after a Supabase Auth signup.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.set_updated_at() from public;
revoke all on function public.handle_new_user() from public;

-- Row-level security is enabled on every table exposed through public.
alter table public.profiles enable row level security;
alter table public.muscle_groups enable row level security;
alter table public.equipment_types enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_aliases enable row level security;
alter table public.exercise_muscles enable row level security;
alter table public.exercise_equipment enable row level security;
alter table public.workout_templates enable row level security;
alter table public.workout_template_exercises enable row level security;
alter table public.training_schedules enable row level security;
alter table public.schedule_slots enable row level security;
alter table public.training_sessions enable row level security;
alter table public.session_exercises enable row level security;
alter table public.exercise_sets enable row level security;

-- Remove unauthenticated table access and grant signed-in users only the
-- operations that policies below can further constrain.
revoke all on table
  public.profiles,
  public.muscle_groups,
  public.equipment_types,
  public.exercises,
  public.exercise_aliases,
  public.exercise_muscles,
  public.exercise_equipment,
  public.workout_templates,
  public.workout_template_exercises,
  public.training_schedules,
  public.schedule_slots,
  public.training_sessions,
  public.session_exercises,
  public.exercise_sets
from anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select on public.muscle_groups, public.equipment_types to authenticated;
grant select, insert, update, delete on
  public.exercises,
  public.exercise_aliases,
  public.exercise_muscles,
  public.exercise_equipment,
  public.workout_templates,
  public.workout_template_exercises,
  public.training_schedules,
  public.schedule_slots,
  public.training_sessions,
  public.session_exercises,
  public.exercise_sets
to authenticated;

-- Profiles.
create policy profiles_select_own
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy profiles_update_own
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Shared lookup metadata is readable by signed-in users only.
create policy muscle_groups_select_authenticated
  on public.muscle_groups for select to authenticated using (true);
create policy equipment_types_select_authenticated
  on public.equipment_types for select to authenticated using (true);

-- Exercises: global rows are shared; custom rows are private.
create policy exercises_select_accessible
  on public.exercises for select to authenticated
  using (owner_user_id is null or owner_user_id = (select auth.uid()));
create policy exercises_insert_custom
  on public.exercises for insert to authenticated
  with check (owner_user_id = (select auth.uid()));
create policy exercises_update_custom
  on public.exercises for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));
create policy exercises_delete_custom
  on public.exercises for delete to authenticated
  using (owner_user_id = (select auth.uid()));

-- Exercise child metadata follows exercise visibility and ownership.
create policy exercise_aliases_select_accessible
  on public.exercise_aliases for select to authenticated
  using (exists (
    select 1 from public.exercises e
    where e.id = exercise_aliases.exercise_id
      and (e.owner_user_id is null or e.owner_user_id = (select auth.uid()))
  ));
create policy exercise_aliases_insert_custom
  on public.exercise_aliases for insert to authenticated
  with check (exists (
    select 1 from public.exercises e
    where e.id = exercise_aliases.exercise_id
      and e.owner_user_id = (select auth.uid())
  ));
create policy exercise_aliases_update_custom
  on public.exercise_aliases for update to authenticated
  using (exists (
    select 1 from public.exercises e
    where e.id = exercise_aliases.exercise_id
      and e.owner_user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.exercises e
    where e.id = exercise_aliases.exercise_id
      and e.owner_user_id = (select auth.uid())
  ));
create policy exercise_aliases_delete_custom
  on public.exercise_aliases for delete to authenticated
  using (exists (
    select 1 from public.exercises e
    where e.id = exercise_aliases.exercise_id
      and e.owner_user_id = (select auth.uid())
  ));

create policy exercise_muscles_select_accessible
  on public.exercise_muscles for select to authenticated
  using (exists (
    select 1 from public.exercises e
    where e.id = exercise_muscles.exercise_id
      and (e.owner_user_id is null or e.owner_user_id = (select auth.uid()))
  ));
create policy exercise_muscles_insert_custom
  on public.exercise_muscles for insert to authenticated
  with check (exists (
    select 1 from public.exercises e
    where e.id = exercise_muscles.exercise_id
      and e.owner_user_id = (select auth.uid())
  ));
create policy exercise_muscles_update_custom
  on public.exercise_muscles for update to authenticated
  using (exists (
    select 1 from public.exercises e
    where e.id = exercise_muscles.exercise_id
      and e.owner_user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.exercises e
    where e.id = exercise_muscles.exercise_id
      and e.owner_user_id = (select auth.uid())
  ));
create policy exercise_muscles_delete_custom
  on public.exercise_muscles for delete to authenticated
  using (exists (
    select 1 from public.exercises e
    where e.id = exercise_muscles.exercise_id
      and e.owner_user_id = (select auth.uid())
  ));

create policy exercise_equipment_select_accessible
  on public.exercise_equipment for select to authenticated
  using (exists (
    select 1 from public.exercises e
    where e.id = exercise_equipment.exercise_id
      and (e.owner_user_id is null or e.owner_user_id = (select auth.uid()))
  ));
create policy exercise_equipment_insert_custom
  on public.exercise_equipment for insert to authenticated
  with check (exists (
    select 1 from public.exercises e
    where e.id = exercise_equipment.exercise_id
      and e.owner_user_id = (select auth.uid())
  ));
create policy exercise_equipment_update_custom
  on public.exercise_equipment for update to authenticated
  using (exists (
    select 1 from public.exercises e
    where e.id = exercise_equipment.exercise_id
      and e.owner_user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.exercises e
    where e.id = exercise_equipment.exercise_id
      and e.owner_user_id = (select auth.uid())
  ));
create policy exercise_equipment_delete_custom
  on public.exercise_equipment for delete to authenticated
  using (exists (
    select 1 from public.exercises e
    where e.id = exercise_equipment.exercise_id
      and e.owner_user_id = (select auth.uid())
  ));

-- Workout templates.
create policy workout_templates_select_own
  on public.workout_templates for select to authenticated
  using (user_id = (select auth.uid()));
create policy workout_templates_insert_own
  on public.workout_templates for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy workout_templates_update_own
  on public.workout_templates for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy workout_templates_delete_own
  on public.workout_templates for delete to authenticated
  using (user_id = (select auth.uid()));

create policy workout_template_exercises_select_own
  on public.workout_template_exercises for select to authenticated
  using (exists (
    select 1 from public.workout_templates wt
    where wt.id = workout_template_exercises.workout_template_id
      and wt.user_id = (select auth.uid())
  ));
create policy workout_template_exercises_insert_own
  on public.workout_template_exercises for insert to authenticated
  with check (
    exists (
      select 1 from public.workout_templates wt
      where wt.id = workout_template_exercises.workout_template_id
        and wt.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.exercises e
      where e.id = workout_template_exercises.exercise_id
        and (e.owner_user_id is null or e.owner_user_id = (select auth.uid()))
    )
  );
create policy workout_template_exercises_update_own
  on public.workout_template_exercises for update to authenticated
  using (exists (
    select 1 from public.workout_templates wt
    where wt.id = workout_template_exercises.workout_template_id
      and wt.user_id = (select auth.uid())
  ))
  with check (
    exists (
      select 1 from public.workout_templates wt
      where wt.id = workout_template_exercises.workout_template_id
        and wt.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.exercises e
      where e.id = workout_template_exercises.exercise_id
        and (e.owner_user_id is null or e.owner_user_id = (select auth.uid()))
    )
  );
create policy workout_template_exercises_delete_own
  on public.workout_template_exercises for delete to authenticated
  using (exists (
    select 1 from public.workout_templates wt
    where wt.id = workout_template_exercises.workout_template_id
      and wt.user_id = (select auth.uid())
  ));

-- Optional recurring schedules.
create policy training_schedules_select_own
  on public.training_schedules for select to authenticated
  using (user_id = (select auth.uid()));
create policy training_schedules_insert_own
  on public.training_schedules for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy training_schedules_update_own
  on public.training_schedules for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy training_schedules_delete_own
  on public.training_schedules for delete to authenticated
  using (user_id = (select auth.uid()));

create policy schedule_slots_select_own
  on public.schedule_slots for select to authenticated
  using (exists (
    select 1 from public.training_schedules ts
    where ts.id = schedule_slots.training_schedule_id
      and ts.user_id = (select auth.uid())
  ));
create policy schedule_slots_insert_own
  on public.schedule_slots for insert to authenticated
  with check (
    exists (
      select 1 from public.training_schedules ts
      where ts.id = schedule_slots.training_schedule_id
        and ts.user_id = (select auth.uid())
    )
    and (
      workout_template_id is null
      or exists (
        select 1 from public.workout_templates wt
        where wt.id = schedule_slots.workout_template_id
          and wt.user_id = (select auth.uid())
      )
    )
  );
create policy schedule_slots_update_own
  on public.schedule_slots for update to authenticated
  using (exists (
    select 1 from public.training_schedules ts
    where ts.id = schedule_slots.training_schedule_id
      and ts.user_id = (select auth.uid())
  ))
  with check (
    exists (
      select 1 from public.training_schedules ts
      where ts.id = schedule_slots.training_schedule_id
        and ts.user_id = (select auth.uid())
    )
    and (
      workout_template_id is null
      or exists (
        select 1 from public.workout_templates wt
        where wt.id = schedule_slots.workout_template_id
          and wt.user_id = (select auth.uid())
      )
    )
  );
create policy schedule_slots_delete_own
  on public.schedule_slots for delete to authenticated
  using (exists (
    select 1 from public.training_schedules ts
    where ts.id = schedule_slots.training_schedule_id
      and ts.user_id = (select auth.uid())
  ));

-- Training sessions.
create policy training_sessions_select_own
  on public.training_sessions for select to authenticated
  using (user_id = (select auth.uid()));
create policy training_sessions_insert_own
  on public.training_sessions for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      source_workout_template_id is null
      or exists (
        select 1 from public.workout_templates wt
        where wt.id = training_sessions.source_workout_template_id
          and wt.user_id = (select auth.uid())
      )
    )
    and (
      source_schedule_slot_id is null
      or exists (
        select 1 from public.schedule_slots ss
        join public.training_schedules ts on ts.id = ss.training_schedule_id
        where ss.id = training_sessions.source_schedule_slot_id
          and ts.user_id = (select auth.uid())
      )
    )
  );
create policy training_sessions_update_own
  on public.training_sessions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (
      source_workout_template_id is null
      or exists (
        select 1 from public.workout_templates wt
        where wt.id = training_sessions.source_workout_template_id
          and wt.user_id = (select auth.uid())
      )
    )
    and (
      source_schedule_slot_id is null
      or exists (
        select 1 from public.schedule_slots ss
        join public.training_schedules ts on ts.id = ss.training_schedule_id
        where ss.id = training_sessions.source_schedule_slot_id
          and ts.user_id = (select auth.uid())
      )
    )
  );
create policy training_sessions_delete_own
  on public.training_sessions for delete to authenticated
  using (user_id = (select auth.uid()));

create policy session_exercises_select_own
  on public.session_exercises for select to authenticated
  using (exists (
    select 1 from public.training_sessions s
    where s.id = session_exercises.training_session_id
      and s.user_id = (select auth.uid())
  ));
create policy session_exercises_insert_own
  on public.session_exercises for insert to authenticated
  with check (
    exists (
      select 1 from public.training_sessions s
      where s.id = session_exercises.training_session_id
        and s.user_id = (select auth.uid())
    )
    and exercise_id is not null
    and exists (
      select 1 from public.exercises e
      where e.id = session_exercises.exercise_id
        and (e.owner_user_id is null or e.owner_user_id = (select auth.uid()))
    )
    and (
      source_template_exercise_id is null
      or exists (
        select 1
        from public.workout_template_exercises wte
        join public.workout_templates wt on wt.id = wte.workout_template_id
        where wte.id = session_exercises.source_template_exercise_id
          and wt.user_id = (select auth.uid())
      )
    )
  );
create policy session_exercises_update_own
  on public.session_exercises for update to authenticated
  using (exists (
    select 1 from public.training_sessions s
    where s.id = session_exercises.training_session_id
      and s.user_id = (select auth.uid())
  ))
  with check (
    exists (
      select 1 from public.training_sessions s
      where s.id = session_exercises.training_session_id
        and s.user_id = (select auth.uid())
    )
    and (
      exercise_id is null
      or exists (
        select 1 from public.exercises e
        where e.id = session_exercises.exercise_id
          and (e.owner_user_id is null or e.owner_user_id = (select auth.uid()))
      )
    )
    and (
      source_template_exercise_id is null
      or exists (
        select 1
        from public.workout_template_exercises wte
        join public.workout_templates wt on wt.id = wte.workout_template_id
        where wte.id = session_exercises.source_template_exercise_id
          and wt.user_id = (select auth.uid())
      )
    )
  );
create policy session_exercises_delete_own
  on public.session_exercises for delete to authenticated
  using (exists (
    select 1 from public.training_sessions s
    where s.id = session_exercises.training_session_id
      and s.user_id = (select auth.uid())
  ));

create policy exercise_sets_select_own
  on public.exercise_sets for select to authenticated
  using (exists (
    select 1
    from public.session_exercises se
    join public.training_sessions s on s.id = se.training_session_id
    where se.id = exercise_sets.session_exercise_id
      and s.user_id = (select auth.uid())
  ));
create policy exercise_sets_insert_own
  on public.exercise_sets for insert to authenticated
  with check (exists (
    select 1
    from public.session_exercises se
    join public.training_sessions s on s.id = se.training_session_id
    where se.id = exercise_sets.session_exercise_id
      and s.user_id = (select auth.uid())
  ));
create policy exercise_sets_update_own
  on public.exercise_sets for update to authenticated
  using (exists (
    select 1
    from public.session_exercises se
    join public.training_sessions s on s.id = se.training_session_id
    where se.id = exercise_sets.session_exercise_id
      and s.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1
    from public.session_exercises se
    join public.training_sessions s on s.id = se.training_session_id
    where se.id = exercise_sets.session_exercise_id
      and s.user_id = (select auth.uid())
  ));
create policy exercise_sets_delete_own
  on public.exercise_sets for delete to authenticated
  using (exists (
    select 1
    from public.session_exercises se
    join public.training_sessions s on s.id = se.training_session_id
    where se.id = exercise_sets.session_exercise_id
      and s.user_id = (select auth.uid())
  ));

comment on table public.workout_templates is
  'Reusable user-owned workout plans. Mutations never rewrite historical sessions.';
comment on table public.training_sessions is
  'One actual training occurrence. At most one active session is allowed per user.';
comment on table public.session_exercises is
  'Historical exercise snapshots within a training session.';
comment on table public.exercise_sets is
  'Canonical planned and actual set measurements from which performance is derived.';
