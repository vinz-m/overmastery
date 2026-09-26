# Overmastery Training

This context describes the language Overmastery uses to represent planned training, actual training, and progression between exercise exposures.

## Language

**Exercise**:
A movement that can be performed and measured repeatedly, such as Bench Press or Lat Pulldown.
_Avoid_: Lift, movement

**Global Exercise**:
An exercise available to every user from Overmastery's shared exercise library.
_Avoid_: Default exercise, system exercise

**Custom Exercise**:
An exercise owned privately by the user who created it.
_Avoid_: Personal lift, user exercise

**Workout Template**:
A reusable, ordered plan of exercises from which a training session may be started.
_Avoid_: Workout, routine, program

**Template Exercise**:
An exercise's ordered place within a workout template, including its planned set defaults.
_Avoid_: Workout exercise

**Training Session**:
One occurrence of training that records what the user actually performed, independently of the template that may have started it.
_Avoid_: Workout, workout instance

**Session Exercise**:
An exercise as it appears within a particular training session, including its position and recorded sets.
_Avoid_: Workout exercise

**Set**:
A single slot or recorded attempt within a session exercise. Only a completed set contributes to performance.
_Avoid_: Entry, result

**Planned Set**:
A set slot created from the workout template when a training session starts. It remains part of that session's plan whether it is open, completed, or skipped.
In the interface a planned set is just a "set": it is one of the workout's usual sets, as opposed to an extra set the user added. Only extra sets carry a qualifier ("Extra set 1", "+1 extra"), so user-facing copy says "Skip set" and "2 of 3 sets done", never "planned set". Planned Set remains the term in code and the database.
_Avoid_: Required set, remaining set, target set (Target means a performance to beat)

**Extra Set**:
A set added by the user during a training session beyond the planned sets. It may be removed before completion without changing the original plan.
_Avoid_: Planned set, bonus set

**Skipped Set**:
A planned set the user intentionally did not perform. It remains visible in the session record but does not contribute to performance.
_Avoid_: Deleted set, failed set

**Exercise Exposure**:
The completed working sets for one exercise within one finished training session.
_Avoid_: Exercise session, workout result

**Previous Performance**:
The most recent completed exposure to an exercise, regardless of which workout template produced it.
_Avoid_: Last workout

**Exercise Baseline**:
The first completed performance recorded for an exercise, establishing the reference for future progress comparisons.
_Avoid_: First recorded exposure, starting score

**Performance**:
The canonical completed working sets in an exercise exposure. It is the evidence from which comparisons and targets are derived.
_Avoid_: Score, strength score

**Target**:
A concrete performance the user may try to achieve in the current exercise exposure.
_Avoid_: Goal, prescription

**Progress Comparison**:
A factual interpretation of one exercise exposure relative to its previous performance: improved, matched, declined, or not comparable.
_Avoid_: Progress score, momentum

**Active Session**:
The single unfinished training session the user can resume.
_Avoid_: Current workout

**Training Schedule**:
An optional recurring weekly expression of when a user intends to train.
_Avoid_: Program, calendar

**Schedule Slot**:
One intended training day within a training schedule, optionally associated with a workout template.
_Avoid_: Scheduled session, required workout

## Interface wording

The terms above are for code, schema, and docs. On screen, use the words people say at the gym:

| Domain term | On screen | Example |
| --- | --- | --- |
| Training Session | workout | "Finish workout", "Completed workout", "Recent workouts" |
| Workout Template | workout, or saved workout where it must be told apart | "Start workout", "Saved workouts" |
| Planned Set | set | "Skip set", "2 of 3 sets done" |
| Extra Set | extra set | "Extra set 1", "+1 extra" |
| Exercise Exposure | time (the exercise was done) | "Logged 6 times", "4th time" |
| Exercise Baseline | first time | "First time logged" |
| Load | weight (or "assistance", "added weight" by tracking type) | "Enter a valid weight." |

_Avoid on screen_: session, template, exposure, baseline, load, movement.

**Units**: an exercise reads in the unit it was last logged in, everywhere: Home, the workout screen, summaries, Progress, and its whole history. Machines and plates are labelled in kg or lb, so a lb machine keeps showing the lb numbers on it, and one exercise's history never mixes units. The profile unit is the default for new exercises and for sets logged without an explicit unit. A workout can therefore mix kg and lb across exercises; that is intended. Converted values that do appear are rounded to one decimal.

