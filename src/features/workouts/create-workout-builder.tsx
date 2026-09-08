"use client";

import Link from "next/link";
import { useActionState, useMemo, useState, useTransition } from "react";

import { recordGuidance } from "@/features/guidance/actions";
import {
  hasSeenGuidance,
  type GuidanceKey,
  type GuidanceOutcome,
  type GuidanceState,
} from "@/features/guidance/model";

import {
  archiveWorkout,
  createCustomExercise,
  createWorkout,
  updateWorkout,
  type CreateExerciseState,
  type CreateWorkoutState,
} from "./actions";
import styles from "./create-workout.module.css";
import type { ExerciseCatalogItem, WorkoutExerciseDraft, WorkoutTemplateDraft } from "./types";

const initialWorkoutState: CreateWorkoutState = {};
const initialExerciseState: CreateExerciseState = {};

export function CreateWorkoutBuilder({
  catalog,
  initialGuidance,
  workout,
}: {
  catalog: ExerciseCatalogItem[];
  initialGuidance: GuidanceState;
  workout?: WorkoutTemplateDraft;
}) {
  const saveWorkout = workout ? updateWorkout.bind(null, workout.id) : createWorkout;
  const [workoutState, workoutAction, workoutPending] = useActionState(
    saveWorkout,
    initialWorkoutState,
  );
  const [exerciseState, exerciseAction, exercisePending] = useActionState(
    createCustomExercise,
    initialExerciseState,
  );
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<WorkoutExerciseDraft[]>(workout?.exercises ?? []);
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  const [guidance, setGuidance] = useState(initialGuidance);
  const [, startGuidanceTransition] = useTransition();

  const available = useMemo(() => {
    const created = exerciseState.exercise ? [exerciseState.exercise] : [];
    const combined = [...created, ...catalog].filter(
      (exercise, index, rows) =>
        rows.findIndex((candidate) => candidate.id === exercise.id) === index,
    );
    const query = search.trim().toLowerCase();

    return combined
      .filter((exercise) => !selected.some((item) => item.id === exercise.id))
      .filter((exercise) => !query || exercise.name.toLowerCase().includes(query))
      .slice(0, 12);
  }, [catalog, exerciseState.exercise, search, selected]);

  const markGuidance = (key: GuidanceKey, outcome: GuidanceOutcome) => {
    setGuidance((current) => ({
      completed:
        outcome === "completed"
          ? [...new Set([...current.completed, key])]
          : current.completed.filter((item) => item !== key),
      dismissed:
        outcome === "dismissed"
          ? [...new Set([...current.dismissed, key])]
          : current.dismissed.filter((item) => item !== key),
    }));
    startGuidanceTransition(() => {
      void recordGuidance(key, outcome);
    });
  };

  const addExercise = (exercise: ExerciseCatalogItem) => {
    setSelected((current) => [
      ...current,
      {
        ...exercise,
        defaultRestSeconds: 120,
        targetRepMax: 12,
        targetRepMin: 8,
        targetSets: 3,
      },
    ]);
    setExpandedExerciseId(exercise.id);
    markGuidance("workout-builder.add-exercise.v1", "completed");
  };

  const updateExercise = (
    index: number,
    field: "defaultRestSeconds" | "targetRepMax" | "targetRepMin" | "targetSets",
    value: number,
  ) => {
    setSelected((current) =>
      current.map((exercise, exerciseIndex) =>
        exerciseIndex === index ? { ...exercise, [field]: value } : exercise,
      ),
    );
    if (!hasSeenGuidance(guidance, "workout-builder.configure-exercise.v1")) {
      markGuidance("workout-builder.configure-exercise.v1", "completed");
    }
  };

  const moveExercise = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= selected.length) return;

    setSelected((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const showAddGuide =
    selected.length === 0 &&
    !hasSeenGuidance(guidance, "workout-builder.add-exercise.v1");
  const showConfigureGuide =
    selected.length > 0 &&
    !hasSeenGuidance(guidance, "workout-builder.configure-exercise.v1");
  const showSaveGuide =
    selected.length > 0 &&
    hasSeenGuidance(guidance, "workout-builder.configure-exercise.v1") &&
    !hasSeenGuidance(guidance, "workout-builder.save-workout.v1");

  return (
    <main className={styles.page}>
      <form action={workoutAction} className={styles.builder}>
        <header className={styles.topbar}>
          <Link href="/workouts" aria-label={workout ? "Cancel workout editing" : "Cancel workout creation"}>←</Link>
          <strong>{workout ? "EDIT WORKOUT" : "NEW WORKOUT"}</strong>
          <button disabled={workoutPending || selected.length === 0} type="submit">
            {workoutPending ? "Saving…" : "Save"}
          </button>
        </header>

        <section className={styles.identity}>
          <p>Workout template</p>
          <label>
            <span>Name your workout</span>
            <input
              aria-describedby={workoutState.fieldErrors?.name ? "workout-name-error" : undefined}
              aria-invalid={Boolean(workoutState.fieldErrors?.name)}
              autoFocus
              defaultValue={workout?.name}
              name="name"
              placeholder="e.g. Full Body A"
              required
            />
          </label>
          {workoutState.fieldErrors?.name && <small id="workout-name-error">{workoutState.fieldErrors.name}</small>}
        </section>

        <input name="exercises" type="hidden" value={JSON.stringify(selected)} />

        <section className={styles.ledger}>
          <header>
            <div>
              <span>Session order</span>
              <strong>{selected.length ? `${selected.length} ${selected.length === 1 ? "exercise" : "exercises"}` : "No exercises yet"}</strong>
            </div>
            <small>In your training order</small>
          </header>

          {showConfigureGuide && (
            <Coachmark
              body="Set the working sets, rep range, and rest that should be waiting when this workout starts."
              dismiss={() => markGuidance("workout-builder.configure-exercise.v1", "dismissed")}
              label="Shape the plan"
            />
          )}

          {selected.length === 0 ? (
            <div className={styles.ledgerEmpty}>
              <span>01</span>
              <p>Add exercises below. They will appear here in training order.</p>
            </div>
          ) : (
            <ol className={styles.selectedList}>
              {selected.map((exercise, index) => (
                <li key={exercise.id}>
                  <div className={styles.order}>{String(index + 1).padStart(2, "0")}</div>
                  <div className={styles.exerciseConfig}>
                    <header>
                      <button
                        aria-expanded={expandedExerciseId === exercise.id}
                        className={styles.configToggle}
                        onClick={() => setExpandedExerciseId((current) => current === exercise.id ? null : exercise.id)}
                        type="button"
                      >
                        <span><strong>{exercise.name}</strong><small>{trackingLabel(exercise.trackingType)}</small></span>
                        <i aria-hidden="true">{expandedExerciseId === exercise.id ? "−" : "+"}</i>
                      </button>
                      <div className={styles.orderButtons}>
                        <button disabled={index === 0} onClick={() => moveExercise(index, -1)} type="button" aria-label={`Move ${exercise.name} earlier`}>↑</button>
                        <button disabled={index === selected.length - 1} onClick={() => moveExercise(index, 1)} type="button" aria-label={`Move ${exercise.name} later`}>↓</button>
                        <button onClick={() => {
                          setSelected((current) => current.filter((_, itemIndex) => itemIndex !== index));
                          setExpandedExerciseId((current) => current === exercise.id ? null : current);
                        }} type="button" aria-label={`Remove ${exercise.name}`}>×</button>
                      </div>
                    </header>
                    {expandedExerciseId === exercise.id && <div className={styles.configGrid}>
                      <NumberField label="Sets" max={20} min={1} value={exercise.targetSets} onChange={(value) => updateExercise(index, "targetSets", value)} />
                      <NumberField label="Rep min" max={100} min={1} value={exercise.targetRepMin} onChange={(value) => updateExercise(index, "targetRepMin", value)} />
                      <NumberField label="Rep max" max={100} min={exercise.targetRepMin} value={exercise.targetRepMax} onChange={(value) => updateExercise(index, "targetRepMax", value)} />
                      <NumberField label="Rest sec" max={3600} min={0} step={15} value={exercise.defaultRestSeconds} onChange={(value) => updateExercise(index, "defaultRestSeconds", value)} />
                    </div>}
                  </div>
                </li>
              ))}
            </ol>
          )}

          {workoutState.fieldErrors?.exercises && <p className={styles.formError}>{workoutState.fieldErrors.exercises}</p>}
        </section>

        <details className={styles.catalogDisclosure} open={selected.length === 0 ? true : undefined}>
          <summary>+ Add exercises</summary>
          <section className={styles.catalog}>
          <header>
            <div><span>Exercise library</span><strong>Add to this workout</strong></div>
            <small>{catalog.length} available</small>
          </header>

          {showAddGuide && (
            <Coachmark
              body="Search the library and add the first movement in your training order."
              dismiss={() => markGuidance("workout-builder.add-exercise.v1", "dismissed")}
              label="Build from the work"
            />
          )}

          <label className={styles.search}>
            <span aria-hidden="true">⌕</span>
            <input aria-label="Search exercises" onChange={(event) => setSearch(event.target.value)} placeholder="Search bench, squat, row…" value={search} />
          </label>

          <div className={styles.catalogList}>
            {available.map((exercise) => (
              <button key={exercise.id} onClick={() => addExercise(exercise)} type="button">
                <div><strong>{exercise.name}</strong><small>{exercise.isCustom ? "Custom" : trackingLabel(exercise.trackingType)}</small></div>
                <span>Add</span>
              </button>
            ))}
            {available.length === 0 && <p>No matching exercises. Create a custom one below.</p>}
          </div>
          </section>
        </details>

        <details className={styles.customExercise}>
          <summary>+ Create a custom exercise</summary>
          <div>
            <label><span>Exercise name</span><input name="customExerciseName" placeholder="e.g. Cable Y-raise" form="custom-exercise-form" /></label>
            <label><span>Track with</span><select name="trackingType" form="custom-exercise-form" defaultValue="weight_reps"><option value="weight_reps">Weight + reps</option><option value="bodyweight_reps">Bodyweight + reps</option><option value="added_weight_reps">Added weight + reps</option><option value="assistance_reps">Assistance + reps</option></select></label>
            <button disabled={exercisePending} form="custom-exercise-form" type="submit">{exercisePending ? "Creating…" : "Create exercise"}</button>
            {exerciseState.message && <p className={styles.formError}>{exerciseState.message}</p>}
            {exerciseState.exercise && <p className={styles.createdMessage}>{exerciseState.exercise.name} is ready in the library above.</p>}
          </div>
        </details>

        {!workout && showSaveGuide && (
          <div className={styles.saveGuide}>
            <Coachmark
              body="Your workout is ready to save. It will return to Workouts as a reusable template."
              dismiss={() => markGuidance("workout-builder.save-workout.v1", "dismissed")}
              label="Keep the plan"
            />
          </div>
        )}

        {workoutState.message && <p className={styles.submitError} role="alert">{workoutState.message}</p>}
        <button className={styles.saveButton} disabled={workoutPending || selected.length === 0} type="submit">
          <span>{workoutPending ? "Saving workout…" : workout ? "Save changes" : "Save workout"}</span><span>→</span>
        </button>
      </form>

      {workout && (
        <form action={archiveWorkout.bind(null, workout.id)} className={styles.archiveForm} onSubmit={(event) => {
          if (!window.confirm(`Archive ${workout.name}? Your completed sessions will stay in history.`)) event.preventDefault();
        }}>
          <button type="submit">Archive workout</button>
          <p>Completed sessions and performance history will not be removed.</p>
        </form>
      )}

      <form action={exerciseAction} id="custom-exercise-form" />
    </main>
  );
}

function Coachmark({ body, dismiss, label }: { body: string; dismiss: () => void; label: string }) {
  return <aside className={styles.coachmark} aria-label="Contextual guidance"><div><span>{label}</span><p>{body}</p></div><button onClick={dismiss} type="button" aria-label="Dismiss tip">×</button></aside>;
}

function NumberField({ label, max, min, onChange, step = 1, value }: { label: string; max: number; min: number; onChange: (value: number) => void; step?: number; value: number }) {
  return <label><span>{label}</span><input inputMode="numeric" max={max} min={min} onChange={(event) => onChange(Number(event.target.value))} step={step} type="number" value={value} /></label>;
}

function trackingLabel(type: ExerciseCatalogItem["trackingType"]) {
  const labels: Record<ExerciseCatalogItem["trackingType"], string> = {
    added_weight_reps: "Added weight + reps",
    assistance_reps: "Assistance + reps",
    bodyweight_reps: "Bodyweight + reps",
    duration: "Duration",
    weight_distance: "Weight + distance",
    weight_duration: "Weight + duration",
    weight_reps: "Weight + reps",
  };
  return labels[type];
}
