# Database schema

This schema supports Overmastery's first multi-user release while preserving the distinction between planned training and completed training.

## Relationship overview

```text
auth.users
└── profiles
    ├── custom exercises
    ├── workout templates
    │   └── workout template exercises ──→ exercises
    ├── training sessions
    │   └── session exercises ──→ exercises (nullable historical reference)
    │       └── exercise sets
    └── training schedules
        └── schedule slots ──→ workout templates (optional)

global exercises
├── exercise aliases
├── exercise muscles ──→ muscle groups
└── exercise equipment ──→ equipment types
```

## Ownership and privacy

- `profiles.id` references the primary key of `auth.users`.
- A null `exercises.owner_user_id` identifies a shared global exercise. A non-null owner identifies a private custom exercise.
- Every user-owned root table stores `user_id` directly.
- Child-table row-level policies derive ownership from their parent rather than duplicating user identifiers that could drift out of sync.
- Anonymous access is revoked. Signed-in users can read shared exercise-library data and only their own private data.
- Global exercise and metadata changes require the server-side service role or an administrative database connection.

## Historical integrity

Workout templates are mutable plans. Starting a session copies the template name, exercise name, tracking type, order, and planned set values into session-owned records. Later template or library edits therefore do not rewrite training history.

`session_exercises.exercise_id` is nullable and uses `on delete set null`. The exercise snapshot remains readable even if a custom exercise is eventually deleted. Templates use `on delete restrict` because an exercise must be removed from active templates before deletion.

## Progression

`exercise_sets` stores planned and actual measurements separately. Completed working sets are canonical performance data. Previous performance, comparison labels, personal bests, and trends should be queried or calculated from completed sessions rather than maintained as competing sources of truth.

The tracking schema supports more than `weight × reps` without requiring a table redesign, but the MVP interface can expose only weight and repetitions.

## Ordering

Template exercises, session exercises, sets, and same-day schedule slots have explicit zero-based positions. Their unique constraints are deferrable so an application transaction can safely swap positions without using temporary out-of-range values.

## Active sessions and scheduling

- A partial unique index permits at most one active session per user.
- Scheduling is optional.
- A recurring schedule slot has a weekday and may reference a workout template or represent an open training day.
- A session may record the schedule slot and planned date it fulfilled.
- Editing a recurring schedule does not change historical sessions.
- Reliable adherence and rescheduling will require explicit dated occurrences later; the initial schema deliberately does not infer historical failures from weekday matching.

## Migration

The initial migration is [`supabase/migrations/20260828000000_initial_schema.sql`](../supabase/migrations/20260828000000_initial_schema.sql). It is intentionally not applied by this change.
