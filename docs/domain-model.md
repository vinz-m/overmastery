# MVP domain model

This document records the product rules needed to build Overmastery's first vertical slice. It complements the domain language in [`CONTEXT.md`](../CONTEXT.md).

## Product defaults

- The MVP records working sets as kilograms and repetitions.
- A user may have only one active session at a time. Starting another session resumes or explicitly abandons the existing one.
- Previous performance is the latest completed exposure to an exercise across every training session, not merely the latest use of the same template.
- Only completed working sets contribute to performance and progression comparisons.
- A template initializes a session but is never changed implicitly by edits made during that session.
- A finished session is historical fact. Later template or exercise-library edits do not rewrite it.
- Progress is derived from canonical set data rather than stored as an independent source of truth.

## Core model

```text
User
├── owns Workout Templates
├── owns Training Sessions
└── may own Custom Exercises

Workout Template
└── ordered Template Exercises → Exercise

Training Session
└── ordered Session Exercises → Exercise snapshot/reference
    └── ordered Sets

Exercise Exposure
└── derived from one completed Session Exercise in a finished Training Session
```

## Entity responsibilities

### Exercise

Identifies a measurable movement. An exercise is either global or owned by one user. The first MVP supports only `weight_reps` tracking, while retaining an explicit tracking type so additional measurement models do not require redefining exercise identity.

### Workout Template

Stores a name and an ordered list of exercises. It describes intent, not history. Adding, removing, or reordering a session exercise does not modify its originating template.

### Training Session

Stores the lifecycle and timing of one real training occurrence. Its lifecycle is `active → completed` or `active → abandoned`. A completed or abandoned session cannot become active again. A session with no set logged for 4 hours is closed automatically: completed, ending at its last logged set, or removed if nothing was logged. Abandoned means the user discarded a session that had logged sets. A set logged offline is judged by when it was logged, so it can still join its session after the session was closed.

### Session Exercise

Captures an exercise's place in a session. It survives template changes and can be skipped or reordered without affecting the template. Its completed sets form an exercise exposure when the session is finished.

### Set

Stores planned defaults and actual performance separately. Planned sets are copied from the template when the session starts and retain their identity as open, completed, or skipped slots. Sets added during the session are extras outside that original target. For the MVP, actual performance consists of weight, repetitions, completion state, and order. Only completed sets contribute to performance; reopening one is an explicit correction of the session record.

## Invariants

1. Every user-owned record is scoped to exactly one user.
2. A session is a snapshot, not a live view of its template.
3. Set and exercise ordering is explicit and stable.
4. Weight is stored as a decimal value in kilograms; display conversion can be added later.
5. Repetitions are non-negative whole numbers and weight is non-negative.
6. Completing a set requires valid actual values.
7. A completed session must contain at least one completed working set.
8. Previous performance excludes active, abandoned, and skipped work.
9. Client-generated stable identifiers allow offline records to synchronize idempotently.
10. Derived comparison labels can always be recomputed from completed sets.

## Initial comparison rules

For two exposures using the same tracking type:

1. If all comparable sets use a higher weight and completed volume is not lower, classify as **improved**.
2. At the same weight, if total completed repetitions increase, classify as **improved**.
3. At the same weight with the same ordered repetitions, classify as **matched**.
4. At the same weight, if total repetitions decrease, classify as **declined**.
5. Mixed weights, materially different set structures, or missing data produce **not comparable** plus a factual summary.

These rules compare adjacent exposures only. Trend and stall classifications require multiple exposures and are intentionally outside the MVP.

## Edge-case decisions

- Skipping an exercise creates no exposure.
- Completing only part of a planned exercise creates an exposure from the completed sets.
- Skipping an uncompleted planned set preserves its slot and records it as skipped, retaining the original session target while excluding it from performance.
- Removing an uncompleted extra set deletes that extra from the active session because it was never part of the original plan.
- Skipping the final open planned set after recording other sets completes the exercise with fewer completed sets than planned. Every session surface must retain the original planned-set count and distinguish completed, skipped, open, and extra outcomes.
- Set-plan shorthand uses completed repetitions for completed slots, `×` for skipped slots, and `—` for open slots (for example, `12 / × / —`).
- An exercise added during a session behaves exactly like one copied from a template.
- Repeating an exercise twice in one session produces two session exercises but one combined exposure only if explicitly grouped in a future version. The MVP prevents duplicate exercise selection within a session.
- Warm-up sets are deferred. All sets in the MVP are working sets.
- Dumbbell values are recorded as the weight of one dumbbell, communicated in the exercise UI when relevant.

## Optional scheduling direction

Scheduling is a statement of intent and must remain separate from completed training history.

```text
User
└── Training Schedule
    └── weekly Schedule Slots
        ├── weekday
        └── optional Workout Template
```

- A user can train without creating a schedule.
- A schedule slot may name a workout template or remain an open training day.
- A training session may record which schedule slot it fulfilled, but it remains valid without one.
- Editing the recurring schedule does not rewrite historical sessions.
- Missing a schedule slot creates no session and no fabricated performance data.
- Adherence should be reported factually over a period, such as `3 of 4 planned sessions completed`, without streaks or punitive language.
- Rescheduling and explicit schedule occurrences should be designed only when adherence is implemented; weekday matching alone is insufficient for reliable historical adherence.
