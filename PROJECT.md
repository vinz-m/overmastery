# Overmastery

> A personal progressive-overload tracker focused on understanding whether your lifts are actually progressing and what you should aim to beat next.

---

## 1. Product Overview

Overmastery is a mobile-first workout tracking application built around progressive overload.

It is not intended to become a general-purpose fitness platform.

The core problem it solves is simple:

> What did I do last time, am I progressing, and what should I try to beat today?

Traditional workout trackers primarily focus on recording workouts:

**Plan → Log → History**

Overmastery focuses on progression:

**Previous Performance → Today's Target → Train → Evaluate Progress → Next Target**

Workout logging exists to support this loop rather than being the product's primary purpose.

---

## 2. Product Philosophy

### 2.1 Progression First

The application should not simply tell the user:

> Here's what you did.

It should help answer:

> Here's where you currently stand.

> Here's what you did previously.

> Here's what you should try to beat.

> Here's whether you're actually improving.

The progression history of each exercise is therefore one of the most important pieces of data in the application.

### 2.2 Exercise-First Mental Model

Most workout applications primarily organize data around workouts.

Overmastery should treat the individual exercise/lift as an equally important first-class object.

For example:

```text
Bench Press

Current:
80 kg

Last:
8 / 8 / 7

Target:
8 / 8 / 8

Recent Trend:
Improving

Best:
80 kg × 8
```

Users should be able to open an exercise and quickly understand:

- Where am I currently?
- What have I done recently?
- Am I progressing?
- What is my current target?
- What should I try next?
- How has this lift changed over time?

Workouts are collections of these lifts.

### 2.3 The App Does Not Tell Users How to Train

Overmastery should support many training styles rather than enforcing one methodology.

Examples include:

- Push / Pull / Legs
- Upper / Lower
- Full Body
- Bro splits
- Powerlifting-style training
- Hypertrophy-focused training
- Strength-focused training
- Custom routines
- Completely unstructured workouts

The application provides tools for tracking and understanding progression.

It does not prescribe a specific training philosophy.

### 2.4 Real Data Instead of Artificial Gamification

Do not add artificial progression systems merely to increase engagement.

Avoid concepts such as:

- XP
- Levels
- Coins
- Artificial strength scores
- Workout streak pressure
- Momentum scores
- Arbitrary achievements
- RPG-style character progression

Actual training progression should provide the feedback.

Examples:

```text
+1 rep from last session
```

```text
+2.5 kg since June
```

```text
Completed 8 / 8 / 8
Next target: 82.5 kg
```

```text
No progression across the last 4 exposures
```

These are meaningful because they represent real performance.

---

## 3. Core Product Loop

The central Overmastery loop is:

```text
Previous Performance
        ↓
Today's Target
        ↓
Perform Exercise
        ↓
Record Sets
        ↓
Evaluate Performance
        ↓
Update Progress
        ↓
Determine Next Target
        ↓
Repeat
```

The quality and speed of this loop should take priority over adding additional fitness features.

---

## 4. Platform Strategy

### Initial Platform

Overmastery should initially be built as a:

**Mobile-first Progressive Web App (PWA)**

The application should be designed like a mobile application rather than a responsive desktop dashboard.

Primary usage is expected to happen:

- at the gym
- between sets
- using one hand
- on a phone
- with limited time for interaction

Desktop/browser support is useful but secondary.

### Why PWA First

A PWA allows:

- installation to the phone home screen
- distribution without App Store approval
- distribution without Google Play approval
- sharing through a URL
- rapid deployment
- immediate updates
- inexpensive private testing
- desktop access
- eventual migration to native packaging

Users should be able to:

1. Open the Overmastery URL.
2. Create an account.
3. Add it to their home screen.
4. Use it similarly to an installed application.

### Potential Native Distribution Later

If Overmastery proves useful and worth distributing more broadly:

```text
PWA
 ↓
Capacitor
 ↓
Android / iOS
```

Native distribution should not be a requirement for the MVP.

---

## 5. Multi-User From Day One

Although Overmastery begins as a personal application, the architecture should support multiple independent users.

Each user's training information must be private and isolated.

Example:

```text
User
 ├── Workout Templates
 ├── Custom Exercises
 ├── Exercise Configuration
 ├── Progression Rules
 ├── Training Sessions
 ├── Sets
 └── Performance History
```

Shared/global data may include:

```text
Exercise Library
Exercise Metadata
Equipment Types
Muscle Groups
```

There is currently no need for:

- friends
- followers
- social feeds
- leaderboards
- public profiles
- community features

Private-by-default personal training is the priority.

---

## 6. Exercise Library

Users should not normally need to manually create exercises.

Overmastery should provide a pre-built searchable exercise library.

Example search:

```text
incline dumb
```

Result:

```text
Incline Dumbbell Bench Press

Chest
Dumbbell
Compound
```

Potential exercise metadata:

```text
Exercise
├── Name
├── Aliases
├── Primary Muscle
├── Secondary Muscles
├── Equipment
├── Movement Pattern
├── Tracking Type
└── Unilateral / Bilateral
```

The exercise library may initially be populated using an appropriately licensed open exercise dataset.

Overmastery should ultimately maintain its own normalized exercise records rather than permanently depending on a third-party API for core functionality.

### Custom Exercises

Users must also be able to create custom exercises.

This handles:

- unusual machines
- gym-specific equipment
- rehabilitation exercises
- personal exercise variations
- exercises missing from the global library

Custom exercises belong to the user who created them.

---

## 7. Exercise Tracking Types

Not every exercise should assume:

```text
weight × reps
```

Exercises should support appropriate measurement models.

| Exercise | Tracking |
|---|---|
| Bench Press | Weight × Reps |
| Dumbbell Curl | Weight × Reps |
| Pull-up | Reps + Optional Added Weight |
| Assisted Pull-up | Assistance + Reps |
| Plank | Duration |
| Farmer's Carry | Weight + Distance / Duration |
| Sled Push | Weight + Distance |
| Bodyweight Exercise | Reps |
| Machine Exercise | Weight × Reps |

The initial MVP can support a smaller subset, but the underlying model should avoid assuming every exercise is identical.

---

## 8. Workout Templates

A workout is primarily a reusable collection of exercises.

Example:

```text
Upper A

Bench Press
Chest Supported Row
Incline Dumbbell Press
Lat Pulldown
Lateral Raise
Triceps Extension
```

Users should be able to create any workout structure they want.

Overmastery does not need a separate "Program" concept for the MVP.

For example:

```text
My Workouts

Upper A
Upper B
Lower A
Lower B
```

The application does not need to know that these constitute an "Upper/Lower Program."

This can be introduced later only if there is a clear product reason.

---

## 9. Workout Templates vs. Training Sessions

This distinction is important.

A **Workout Template** represents what the user generally intends to perform.

A **Training Session** represents what actually happened today.

Example template:

```text
Upper A

Bench Press
Barbell Row
Incline DB Press
Lat Pulldown
Lateral Raise
Triceps
```

During today's session, the user may:

- skip an exercise
- reorder exercises
- substitute an exercise
- add an exercise
- remove an exercise
- add extra sets
- perform fewer sets
- change weight
- change reps

These changes should not automatically modify the saved workout template.

The user may explicitly choose to update the template afterward.

---

## 10. Flexible Training Sessions

Real gym sessions are unpredictable.

The workout interface should therefore allow users to easily make changes during a session.

### Skip

If Bench Press is unavailable, the user should be able to skip it temporarily.

### Reorder

The user should be able to move Bench Press later in the workout.

### Substitute

Example:

```text
Bench Press
      ↓
Machine Chest Press
```

The substitution applies to today's session unless explicitly saved to the template.

### Add Set

```text
Set 1
Set 2
Set 3
+ Add Set
```

### Remove Set

Users should not be forced to perform the planned number of sets.

### Add Exercise

Users should be able to add an unplanned exercise during the workout.

Flexibility should be prioritized over enforcing the workout template.

---

## 11. Progression Modes

Progression should work at two levels.

### 11.1 Simple Tracking

Users should not be required to configure progression rules.

Example:

```text
Bench Press

Last Session

80 kg × 8
80 kg × 8
80 kg × 7
```

During the next session, Overmastery shows the previous performance.

Afterward, the application can determine whether performance:

- improved
- approximately matched
- declined

This mode should require almost no configuration.

### 11.2 Structured Progression

Advanced users may optionally define explicit progression rules.

Example:

```text
Bench Press

Progression:
Double Progression

Sets:
3

Rep Range:
6–8

Weight Increment:
2.5 kg

Advance When:
All working sets reach 8 reps
```

Performance:

```text
80 kg

Session 1
6 / 6 / 6

Session 2
7 / 6 / 6

Session 3
7 / 7 / 6

Session 4
8 / 7 / 7

Session 5
8 / 8 / 8
```

Overmastery can then determine:

```text
Progression Complete

Next:
82.5 kg × 6–8
```

---

## 12. Progression Engine

The progression engine is one of Overmastery's primary differentiators.

Its purpose is to interpret performance history rather than merely store it.

Potential signals include:

### Weight Progression

```text
80 kg → 82.5 kg
```

### Rep Progression

```text
80 × 7 → 80 × 8
```

### Set Progression

```text
8 / 8 / 7
      ↓
8 / 8 / 8
```

### Estimated Strength

Estimated strength trends may eventually be calculated using an estimated 1RM formula.

This should remain secondary to actual working-set performance.

### Repeated Exposure

The system should recognize when an exercise has remained unchanged across multiple exposures.

---

## 13. Progress Is Not Linear

Overmastery should not treat one bad session as regression.

Example:

```text
Aug 03    7 / 7 / 6
Aug 10    8 / 7 / 6
Aug 17    8 / 8 / 7
Aug 24    7 / 7 / 7
```

Although the latest session declined, the overall trend may still indicate improvement.

Progress analysis should eventually consider multiple recent exposures rather than simply:

```text
current_session > previous_session
```

The exact algorithm should be designed and tested separately.

---

## 14. Exercise Progress States

Exercises may eventually receive interpretable progression states.

Potential states:

### New

Not enough data exists.

### Progressing

Recent meaningful improvement.

### Building

Performance is improving gradually within the current weight/range.

### Stable

Performance is relatively unchanged.

### Stalling

No meaningful improvement after multiple exposures.

### Regressing

Repeated decline across multiple exposures.

These should be derived from actual training data.

They are not gamification scores.

The exact classification rules remain TBD.

---

## 15. Lift / Exercise Detail

Every tracked exercise should eventually have its own detailed view.

Example:

```text
BENCH PRESS

Current Working Weight
80 kg

Current Target
3 × 6–8

Last Performance
8 / 8 / 7

Next Target
8 / 8 / 8

Recent Trend
Improving

Best Performance
80 kg × 8

Sessions at Current Weight
3
```

Below this may be:

```text
Recent Sessions

Aug 24
80 kg
8 / 8 / 7

Aug 17
80 kg
8 / 7 / 7

Aug 10
80 kg
7 / 7 / 6
```

Eventually charts may visualize longer-term progression.

Charts should supplement the data rather than becoming the product itself.

---

## 16. Active Workout Experience

The active workout interface is one of the most important parts of the application.

It must be extremely fast.

Example:

```text
BENCH PRESS

Today
80 kg

Target
8 / 8 / 8

Previous
8 / 8 / 7


SET 1

80 kg × [ 8 ]

✓


SET 2

80 kg × [   ]


SET 3

80 kg × [   ]
```

Interactions should minimize typing and taps.

Important considerations:

- large touch targets
- numeric keyboard automatically shown
- previous weight automatically populated
- previous performance visible
- quick set completion
- easy weight adjustment
- easy rep adjustment
- easy set addition/removal
- one-handed operation where possible

The design question should continually be:

> I have 60–120 seconds before my next set. How quickly can I see what I need to do, record my performance, and put my phone down?

---

## 17. Rest Timer

A rest timer is appropriate because it directly supports the workout flow.

Potential behavior:

```text
Complete Set
     ↓
Rest Timer Automatically Starts
     ↓
User Continues When Ready
```

Users should be able to:

- configure default rest durations
- skip the timer
- add/subtract time
- disable automatic timers

Rest timers should remain utility-focused and not become gamification.

---

## 18. Progress Feedback

After completing an exercise, Overmastery may provide immediate factual feedback.

Examples:

```text
+2 total reps vs previous session
```

```text
Matched previous performance
```

```text
New best at 80 kg
```

```text
Progression target completed
```

```text
Next target:
82.5 kg × 6–8
```

Avoid excessive celebration for trivial records.

The product should feel informative rather than noisy.

---

## 19. Progress View

The Progress area should primarily answer:

> Am I actually getting stronger?

Example:

```text
LAST 30 DAYS

Bench Press
+5 kg

Lat Pulldown
+4 reps

Incline DB Press
No meaningful change

Squat
+5 kg
```

Potential observations:

```text
Bench Press reached a new working weight.
```

```text
Incline Dumbbell Press has remained at the same performance range for 4 sessions.
```

```text
3 exercises progressed this week.
```

These observations should be grounded in actual performance data.

---

## 20. Progress Stories

Instead of relying only on charts, Overmastery can eventually describe meaningful progression.

Example:

```text
Incline Dumbbell Press

You started 30 kg at:

8 / 7 / 6

Your latest session:

10 / 10 / 9

You're one rep away from completing
your current progression range.
```

Another example:

```text
Bench Press

June 04
70 kg × 8

June 19
75 kg × 8

July 12
77.5 kg × 8

August 24
80 kg × 8

+10 kg in 81 days
```

This may be more understandable and motivating than generic analytics.

Not required for the initial MVP.

---

## 21. Navigation Direction

Current candidate primary navigation:

```text
TODAY
LIFTS
PROGRESS
```

Workout management may be accessible through Today, settings, or another secondary interface.

This is not finalized.

Avoid conventional SaaS navigation such as:

```text
Dashboard
Analytics
Exercises
Workouts
Settings
```

The application should feel like a purpose-built mobile tool.

---

## 22. Offline / Local-First Behavior

Workout logging should not depend on reliable internet connectivity.

Gyms frequently have unreliable cellular reception.

Ideal behavior:

```text
User Records Set
      ↓
Save Locally Immediately
      ↓
Update UI Immediately
      ↓
Internet Available?
    /             \
  Yes              No
   ↓                ↓
Sync              Queue
                     ↓
              Sync Later
```

A network request should not block recording a set.

Potential local storage:

**IndexedDB**

Server data provides:

- account synchronization
- backup
- multi-device access

Local data provides:

- responsiveness
- offline workout support
- reliability

Exact synchronization architecture remains TBD.

---

## 23. Initial Technical Direction

Current likely stack:

```text
Next.js
TypeScript
Tailwind CSS
shadcn/ui (selectively)
PostgreSQL
Supabase
PWA
IndexedDB
```

Potential future packaging:

```text
Capacitor
```

These technologies are starting points, not immutable requirements.

Architecture decisions should prioritize:

- simplicity
- solo-developer maintainability
- fast iteration
- mobile performance
- offline reliability
- inexpensive hosting
- straightforward multi-user data isolation

---

## 24. Potential Core Data Model

This is conceptual and should be refined before database implementation.

```text
User

Exercise
 ├── Global Exercise
 └── Custom Exercise

Workout Template
 └── Template Exercises

Exercise Configuration
 ├── Progression Type
 ├── Set Target
 ├── Rep Range
 ├── Weight Increment
 └── Rest Duration

Training Session
 └── Session Exercises
      └── Sets

Set
 ├── Weight
 ├── Reps
 ├── Duration
 ├── Distance
 └── Other Tracking Data

Performance / Progress
 └── Derived from session history
```

Avoid storing derived analytics when they can safely be calculated from canonical workout data unless performance requirements justify caching them.

---

## 25. MVP

The MVP should prove one thing:

> Is Overmastery's progression-focused workout experience useful enough that someone wants to use it every time they train?

Minimum loop:

```text
Account
   ↓
Choose/Create Exercises
   ↓
Create Workout
   ↓
Start Workout
   ↓
See Previous Performance
   ↓
Record Weight + Reps
   ↓
Finish Workout
   ↓
Compare Performance
   ↓
Return Next Time
   ↓
Try to Beat Previous Performance
```

---

## 26. MVP Features

### Accounts

- Sign up
- Sign in
- Sign out
- Private user data

### Exercise Library

- Search exercises
- Select exercises
- Basic metadata
- Create custom exercise

### Workout Templates

- Create workout
- Rename workout
- Add exercises
- Remove exercises
- Reorder exercises

### Active Workout

- Start from template
- View previous performance
- Record sets
- Record weight
- Record reps
- Add set
- Remove set
- Skip exercise
- Reorder if practical
- Finish workout

### History

- Save completed sessions
- View previous exercise performances
- View recent workout sessions

### Basic Progression

- Compare against previous exposure
- Identify increased weight
- Identify increased reps
- Identify matched performance
- Show previous performance during training

### PWA

- Installable
- Mobile-first
- Basic offline resilience

---

## 27. Post-MVP Candidates

Features to consider only after the core experience is proven:

- structured double progression
- customizable progression rules
- automatic next-target generation
- progression states
- exercise substitution
- advanced offline synchronization
- progression charts
- estimated 1RM
- progress stories
- rest timers
- plate calculator
- warm-up set support
- RPE / RIR
- notes
- supersets
- drop sets
- multiple progression strategies
- export/import
- native Android/iOS packaging

None of these should delay validating the basic progression loop.

---

## 28. Explicitly Out of Scope

Overmastery should avoid becoming a broad fitness platform.

Do not prioritize:

- calorie tracking
- nutrition
- meal planning
- step tracking
- sleep tracking
- cardio platform features
- wearable integrations
- social feeds
- followers
- leaderboards
- coaching marketplace
- generic AI workout generation
- exercise tutorial video platform
- transformation photos
- body measurements
- arbitrary workout streaks
- XP
- levels
- fictional stats
- Momentum scores
- artificial gamification

These can only be reconsidered if they directly solve a demonstrated user problem.

---

## 29. Brand

### Name

**Overmastery**

Preferred spelling:

```text
Overmastery
```

Potential visual treatment:

```text
OVERMASTERY
```

Avoid using:

```text
Over Mastery
```

unless there is a specific reason.

### Name Meaning

The name naturally supports the product concept.

**OVER**

- progressive overload
- exceed previous performance
- move beyond the current threshold

**MASTERY**

- developing proficiency
- long-term improvement
- mastering individual movements

Together:

> Continually develop beyond your current capability.

### Brand Direction

Although the naming exploration was inspired partly by MMO/JRPG progression terminology, Overmastery should not visually imitate a game.

Avoid:

- fantasy UI
- RPG menus
- XP bars
- character sheets
- fantasy iconography
- Granblue references
- JRPG references
- Mastery Points
- fictional progression systems

The RPG influence should exist primarily in the underlying concept:

> Persistent, meaningful progression.

The actual product should feel:

- focused
- modern
- understated
- performance-oriented
- personal
- data-aware
- fast

---

## 30. Name / Trademark Caveat

Initial public searches did not reveal an obvious fitness application or exact trademark collision for the one-word **Overmastery** name.

However:

- "Over Mastery" is terminology used by Granblue Fantasy.
- "Overmastery" has also appeared in other fictional works.
- A public web search is not equivalent to professional trademark clearance.
- Official trademark databases should be manually checked before significant commercial investment.
- Formal legal clearance may be appropriate if the product gains meaningful commercial traction.

For early personal development and private beta use, Overmastery is the current working brand.

Do not imitate branding, terminology, assets, or visual designs belonging to existing properties using similar terminology.

---

## 31. Design Principles & Product North Star

### 31.1 Fast

Logging a set should take seconds.

### 31.2 Previous Performance Is Always Close

Users should not need to search through workout history while training.

### 31.3 Progression Over Logging

Recording data exists so Overmastery can understand progression.

### 31.4 Flexible

Never assume everyone follows the same training methodology.

### 31.5 Quiet

Avoid excessive notifications, celebrations, gamification, and visual noise.

### 31.6 Honest

Do not pretend noisy fitness data is more precise than it actually is.

One poor workout does not automatically mean regression.

### 31.7 Personal

The primary experience is the user versus their previous performance.

Not the user versus other users.

### 31.8 Mobile First

Optimize every important interaction for use between sets on a phone.

### Product North Star

When considering a new feature, ask:

> Does this help the user understand or improve their training progression?

If not, it probably does not belong in Overmastery.

The core promise remains:

> **Know where your lifts stand. Know what to beat next.**