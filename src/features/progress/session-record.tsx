"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { motion } from "motion/react";

import {
  correctCompletedSets,
  type SetCorrection,
} from "@/features/sessions/actions";
import { formatPerformance, loadLabel } from "@/features/sessions/performance";
import { DeleteWorkoutButton } from "@/features/sessions/delete-workout-button";
import type { TrackingType } from "@/features/sessions/types";
import { navForward } from "@/features/navigation/page-transition";
import {
  convertLoadInput,
  loadUnit,
  toDisplayLoad,
  toKilograms,
  type UnitSystem,
} from "@/lib/units";

import { planLabel } from "./format";
import styles from "./progress.module.css";
import type { HistoryExercise, HistorySession, HistorySet } from "./types";

type SetDraft = {
  load: string;
  /** Typed by the user, rather than shown from the stored weight. */
  loadEdited: boolean;
  reps: string;
};
// Units are per exercise: its sets are done on the same equipment, and
// barbells and machines are often labelled differently.
type Draft = {
  sets: Record<string, SetDraft>;
  units: Record<string, UnitSystem>;
};

const unitOptions: Array<{ label: string; value: UnitSystem }> = [
  { label: "kg", value: "metric" },
  { label: "lb", value: "imperial" },
];

/** The results of a finished session, viewable in kg or lb and correctable. */
export function SessionRecord({
  session,
  unitSystem,
}: {
  session: HistorySession;
  unitSystem: UnitSystem;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const skippedExercises = session.exercises.filter(
    (exercise) => exercise.completedSets === 0,
  ).length;
  const sets = session.exercises.flatMap((exercise) =>
    exercise.sets.map((set) => ({ exercise, set })),
  );

  const startEditing = () => {
    setMessage(null);
    const units = Object.fromEntries(
      session.exercises.map((exercise) => [exercise.id, exercise.displayUnit]),
    );
    setDraft({
      sets: Object.fromEntries(
        sets.map(({ exercise, set }) => [
          set.id,
          {
            load: shownLoad(set.loadKg, units[exercise.id]),
            loadEdited: false,
            reps: String(set.reps),
          },
        ]),
      ),
      units,
    });
  };

  const switchUnit = (exercise: HistoryExercise, unit: UnitSystem) =>
    setDraft((current) => {
      if (!current) return current;
      const from = current.units[exercise.id];
      const nextSets = { ...current.sets };
      for (const set of exercise.sets) {
        const setDraft = nextSets[set.id];
        const typed = Number(setDraft.load);
        nextSets[set.id] = {
          ...setDraft,
          // A weight the user typed is converted as typed. One they didn't
          // is shown from the stored kilograms, so switching back and forth
          // can't drift it through rounding.
          load: !setDraft.loadEdited
            ? shownLoad(set.loadKg, unit)
            : setDraft.load !== "" && Number.isFinite(typed)
              ? String(convertLoadInput(typed, from, unit))
              : setDraft.load,
        };
      }
      return {
        sets: nextSets,
        units: { ...current.units, [exercise.id]: unit },
      };
    });

  const save = () => {
    if (!draft) return;
    const corrections: SetCorrection[] = [];
    for (const { exercise, set } of sets) {
      const unit = draft.units[exercise.id];
      const correction = toCorrection(
        set,
        draft.sets[set.id],
        unit,
        // Only relabel sets whose exercise was switched to another unit.
        unit !== exercise.displayUnit,
        exercise.trackingType,
      );
      if (!correction) {
        setMessage(`Check the values for ${exercise.name}.`);
        return;
      }
      if (changed(set, correction, unitSystem)) corrections.push(correction);
    }
    if (corrections.length === 0) {
      setDraft(null);
      return;
    }
    startSaving(async () => {
      setMessage(null);
      try {
        const result = await correctCompletedSets({
          sessionId: session.id,
          sets: corrections,
        });
        if (!result.ok) {
          setMessage(result.message ?? "Your changes could not be saved.");
          return;
        }
        setDraft(null);
      } catch {
        setMessage("You’re offline. Save again once you’re back online.");
      }
    });
  };

  if (draft)
    return (
      <form
        className={styles.recordEditor}
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <p className={styles.recordHint}>
          Fix a weight or rep count that was logged wrong. Set each exercise to
          kg or lb to match its equipment.
          {skippedExercises > 0 &&
            ` The ${skippedExercises} skipped ${skippedExercises === 1 ? "exercise has" : "exercises have"} no sets to edit.`}
        </p>
        {session.exercises
          .filter((exercise) => exercise.sets.length > 0)
          .map((exercise) => (
            <section
              aria-labelledby={`record-exercise-${exercise.id}`}
              className={styles.recordExercise}
              key={exercise.id}
            >
              <header>
                <h3 id={`record-exercise-${exercise.id}`}>{exercise.name}</h3>
                <UnitSwitch
                  legend={`${exercise.name} weights in`}
                  name={`record-unit-${exercise.id}`}
                  onChange={(unit) => switchUnit(exercise, unit)}
                  value={draft.units[exercise.id]}
                />
              </header>
              {exercise.sets.map((set, index) => (
                <SetFields
                  draft={draft.sets[set.id]}
                  exerciseName={exercise.name}
                  key={set.id}
                  label={`Set ${index + 1}`}
                  onChange={(next) =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            sets: { ...current.sets, [set.id]: next },
                          }
                        : current,
                    )
                  }
                  trackingType={exercise.trackingType}
                  unit={draft.units[exercise.id]}
                />
              ))}
            </section>
          ))}
        {message && (
          <p className={styles.recordError} role="alert">
            {message}
          </p>
        )}
        <div className={styles.recordActions}>
          <button
            disabled={saving}
            onClick={() => setDraft(null)}
            type="button"
          >
            Cancel
          </button>
          <button disabled={saving} type="submit">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    );

  return (
    <>
      <div className={styles.recordToolbar}>
        {sets.length > 0 && (
          <button
            className={styles.recordEdit}
            onClick={startEditing}
            type="button"
          >
            Edit sets
          </button>
        )}
      </div>
      <section className={styles.detailResults}>
        {session.exercises.map((exercise, index) => (
          <ExerciseResult exercise={exercise} index={index} key={exercise.id} />
        ))}
      </section>
      <DeleteWorkoutButton
        className={styles.recordDelete}
        sessionId={session.id}
      />
    </>
  );
}

function ExerciseResult({
  exercise,
  index,
}: {
  exercise: HistoryExercise;
  index: number;
}) {
  const { comparison } = exercise;
  const skipped = exercise.completedSets === 0;
  // A skipped exercise gets one quiet line, so it can't pass for a done one.
  const content = skipped ? (
    <>
      <span>{String(index + 1).padStart(2, "0")}</span>
      <h2>{exercise.name}</h2>
      <strong>Skipped</strong>
    </>
  ) : (
    <>
      <span>{String(index + 1).padStart(2, "0")}</span>
      <div>
        <h2>{exercise.name}</h2>
        <p>
          {formatPerformance(
            exercise.trackingType,
            exercise.loadKg,
            exercise.reps,
            exercise.displayUnit,
          )}
        </p>
        <small>
          {planLabel(
            exercise.plannedCompletedSets,
            exercise.plannedSets,
            exercise.skippedSets,
            exercise.extraCompletedSets,
          )}
        </small>
      </div>
      <strong className={styles[comparison.state]}>{comparison.label}</strong>
    </>
  );
  const className = skipped ? styles.resultSkipped : undefined;
  return exercise.exerciseId ? (
    <Link
      className={className}
      href={`/progress/exercises/${exercise.exerciseId}`}
      transitionTypes={navForward}
    >
      {content}
    </Link>
  ) : (
    <article className={className}>{content}</article>
  );
}

function UnitSwitch({
  legend,
  name,
  onChange,
  value,
}: {
  legend: string;
  name: string;
  onChange: (unit: UnitSystem) => void;
  value: UnitSystem;
}) {
  return (
    <fieldset className={styles.unitSwitch}>
      <legend className={styles.visuallyHidden}>{legend}</legend>
      {unitOptions.map((option) => (
        <label key={option.value}>
          <input
            checked={value === option.value}
            name={name}
            onChange={() => onChange(option.value)}
            type="radio"
            value={option.value}
          />
          {value === option.value && (
            <motion.span
              className={styles.unitSelection}
              layoutId={`${name}-selection`}
              transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
            />
          )}
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

function SetFields({
  draft,
  exerciseName,
  label,
  onChange,
  trackingType,
  unit,
}: {
  draft: SetDraft;
  exerciseName: string;
  label: string;
  onChange: (draft: SetDraft) => void;
  trackingType: TrackingType;
  unit: UnitSystem;
}) {
  const loadOptional = trackingType === "bodyweight_reps";
  const loadName = loadLabel(trackingType);
  return (
    <div className={styles.recordSet}>
      <span>{label}</span>
      <label className={styles.recordField}>
        <input
          aria-label={`${exerciseName} ${label.toLowerCase()} ${loadName.toLowerCase()} in ${unit === "imperial" ? "pounds" : "kilograms"}${loadOptional ? ", optional" : ""}`}
          inputMode="decimal"
          min="0"
          onChange={(event) =>
            onChange({ ...draft, load: event.target.value, loadEdited: true })
          }
          placeholder={loadOptional ? "0" : undefined}
          // Stored weights shown in the other unit (61.24 kg) are off the
          // usual 0.25 / 0.5 steps, and would otherwise block saving.
          step="any"
          type="number"
          value={draft.load}
        />
        <span aria-hidden="true">{loadUnit(unit)}</span>
      </label>
      <label className={styles.recordField}>
        <input
          aria-label={`${exerciseName} ${label.toLowerCase()} reps`}
          inputMode="numeric"
          min="0"
          onChange={(event) => onChange({ ...draft, reps: event.target.value })}
          type="number"
          value={draft.reps}
        />
        <span aria-hidden="true">reps</span>
      </label>
    </div>
  );
}

function shownLoad(loadKg: number | null, unit: UnitSystem) {
  return loadKg === null ? "" : String(toDisplayLoad(loadKg, unit));
}

function toCorrection(
  set: HistorySet,
  draft: SetDraft,
  unit: UnitSystem,
  unitSwitched: boolean,
  trackingType: TrackingType,
): SetCorrection | null {
  const reps = Number(draft.reps);
  if (draft.reps === "" || !Number.isInteger(reps) || reps < 0) return null;
  // Not retyped: keep the stored kilograms exactly. The unit changes only if
  // the exercise was switched, so a set logged in another unit stays as it was.
  if (!draft.loadEdited)
    return {
      loadKg: set.loadKg,
      loadUnit: set.loadKg === null ? null : unitSwitched ? unit : set.unit,
      reps,
      setId: set.id,
    };
  if (draft.load === "")
    return trackingType === "bodyweight_reps"
      ? { loadKg: null, loadUnit: null, reps, setId: set.id }
      : null;
  const load = Number(draft.load);
  if (!Number.isFinite(load) || load < 0) return null;
  return {
    loadKg: toKilograms(load, unit),
    loadUnit: unit,
    reps,
    setId: set.id,
  };
}

function changed(
  set: HistorySet,
  correction: SetCorrection,
  unitSystem: UnitSystem,
) {
  if (set.reps !== correction.reps) return true;
  if (correction.loadKg === null) return set.loadKg !== null;
  const unit = correction.loadUnit ?? unitSystem;
  // Only the unit changed, e.g. to show a lb machine's load in lb from now on.
  if (unit !== (set.unit ?? unitSystem)) return true;
  // The draft was rounded for display, so compare in that unit.
  return (
    set.loadKg === null ||
    toDisplayLoad(set.loadKg, unit) !== toDisplayLoad(correction.loadKg, unit)
  );
}
