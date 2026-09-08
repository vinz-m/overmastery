"use client";

import { useActionState, useMemo, useState } from "react";


import {
  PlanningSwitch,
  PrimaryNav,
} from "@/features/navigation/primary-nav";
import {
  createCustomExercise,
  type CreateExerciseState,
} from "@/features/workouts/actions";
import type { ExerciseCatalogItem } from "@/features/workouts/types";

import { AppHeader } from "@/features/navigation/app-header";

import styles from "./exercise-library.module.css";

const initialExerciseState: CreateExerciseState = {};

export function ExerciseLibrary({
  dayEndsAt,
  accountLabel,
  activeSessionId,
  catalog,
}: {
  dayEndsAt: string;
  accountLabel: string;
  activeSessionId?: string;
  catalog: ExerciseCatalogItem[];
}) {
  const [search, setSearch] = useState("");
  const [exerciseState, exerciseAction, exercisePending] = useActionState(
    createCustomExercise,
    initialExerciseState,
  );
  const exercises = useMemo(() => {
    const created = exerciseState.exercise ? [exerciseState.exercise] : [];
    const combined = [...created, ...catalog].filter(
      (exercise, index, rows) =>
        rows.findIndex((candidate) => candidate.id === exercise.id) === index,
    );
    const query = search.trim().toLowerCase();

    return combined.filter(
      (exercise) => !query || exercise.name.toLowerCase().includes(query),
    );
  }, [catalog, exerciseState.exercise, search]);

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <AppHeader accountLabel={accountLabel} />

        <PlanningSwitch active="exercises" />

        <section className={styles.lead}>
          <p>Exercises</p>
          <h1>Find your familiar exercises.</h1>
          <span>
            Browse what is available before building a workout. Custom
            exercises stay private to your account.
          </span>
        </section>

        <section className={styles.controls}>
          <label className={styles.search}>
            <span aria-hidden="true">⌕</span>
            <input
              aria-label="Search exercises"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search bench, squat, row…"
              value={search}
            />
          </label>

          <details className={styles.createExercise}>
            <summary>+ Create a custom exercise</summary>
            <form action={exerciseAction}>
              <label>
                <span>Exercise name</span>
                <input
                  name="customExerciseName"
                  placeholder="e.g. Cable Y-raise"
                  required
                />
              </label>
              <label>
                <span>Track with</span>
                <select defaultValue="weight_reps" name="trackingType">
                  <option value="weight_reps">Weight + reps</option>
                  <option value="bodyweight_reps">Bodyweight + reps</option>
                  <option value="added_weight_reps">Added weight + reps</option>
                  <option value="assistance_reps">Assistance + reps</option>
                </select>
              </label>
              <button disabled={exercisePending} type="submit">
                {exercisePending ? "Creating…" : "Create exercise"}
              </button>
              {exerciseState.message && (
                <p role="alert">{exerciseState.message}</p>
              )}
              {exerciseState.exercise && (
                <p>{exerciseState.exercise.name} is now in your library.</p>
              )}
            </form>
          </details>
        </section>

        <section className={styles.catalog}>
          <header>
            <div>
              <span>Available exercises</span>
              <h2 aria-live="polite" aria-atomic="true">
                {exercises.length} {exercises.length === 1 ? "match" : "matches"}
              </h2>
            </div>
            <small>Choose these while creating a workout</small>
          </header>

          <div className={styles.exerciseList}>
            {exercises.map((exercise, index) => (
              <article key={exercise.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{exercise.name}</strong>
                  <small>{trackingLabel(exercise.trackingType)}</small>
                </div>
                <b>{exercise.isCustom ? "Custom" : "Library"}</b>
              </article>
            ))}
            {exercises.length === 0 && (
              <div className={styles.noResults}>
                No exercises match “{search}”. Try a shorter name.
              </div>
            )}
          </div>
        </section>

        <PrimaryNav
          dayEndsAt={dayEndsAt}
          active="workouts"
          activeSessionId={activeSessionId}
        />
      </section>
    </main>
  );
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
