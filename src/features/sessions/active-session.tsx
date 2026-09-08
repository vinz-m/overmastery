"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PrimaryNav } from "@/features/navigation/primary-nav";
import { scrollToPageTop } from "@/lib/motion";

import {
  addExtraSet,
  completeSet,
  finishSession,
  removeWorkingSet,
  reopenSet,
  restoreMissingPlannedSet,
  restoreSkippedSet,
  skipExercise,
  swapExercise,
} from "./actions";
import {
  comparePerformance,
  completedPerformance,
  formatReps,
} from "./performance";
import {
  formatDisplayLoad,
  loadUnit,
  toDisplayLoad,
  toKilograms,
  type UnitSystem,
} from "@/lib/units";
import {
  canAddExtraSet,
  planOutcomeLabel,
  planTokens,
  projectSetPlan,
  removalActionLabel,
} from "./set-policy";
import styles from "./active-session.module.css";
import type {
  ActiveExercise,
  ActiveSession,
  SessionMutationResult,
  SwapExerciseOption,
} from "./types";

export function ActiveSessionScreen({
  dayEndsAt,
  catalog,
  session,
  unitSystem,
}: {
  dayEndsAt: string;
  catalog: SwapExerciseOption[];
  session: ActiveSession;
  unitSystem: UnitSystem;
}) {
  const router = useRouter();
  const [currentExerciseId, setCurrentExerciseId] = useState(
    session.exercises.find((exercise) => exercise.status !== "skipped")?.id ??
      session.exercises[0]?.id,
  );
  const [elapsedMinutes, setElapsedMinutes] = useState(() =>
    minutesSince(session.startedAt),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const timer = window.setInterval(
      () => setElapsedMinutes(minutesSince(session.startedAt)),
      30_000,
    );
    return () => window.clearInterval(timer);
  }, [session.startedAt]);

  const currentExercise =
    session.exercises.find((exercise) => exercise.id === currentExerciseId) ??
    session.exercises[0];
  const completedSets = session.exercises.reduce(
    (count, exercise) =>
      count + exercise.sets.filter((set) => set.status === "completed").length,
    0,
  );

  const mutate = (
    action: () => Promise<SessionMutationResult>,
    afterSuccess?: () => void,
  ) => {
    startTransition(async () => {
      setMessage(null);
      const result = await action();
      if (!result.ok) {
        setMessage(result.message ?? "That change could not be saved.");
        return;
      }
      afterSuccess?.();
      router.refresh();
    });
  };

  if (!currentExercise) return null;

  const jumpTo = (exerciseId: string) => {
    setCurrentExerciseId(exerciseId);
    scrollToPageTop();
  };

  const moveAfterSkip = () => {
    const currentIndex = session.exercises.findIndex(
      (exercise) => exercise.id === currentExercise.id,
    );
    const next = [
      ...session.exercises.slice(currentIndex + 1),
      ...session.exercises.slice(0, currentIndex),
    ].find((exercise) => exercise.status !== "skipped");
    if (next) setCurrentExerciseId(next.id);
  };

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.stickyHeader}>
          <Link aria-label="Back to workouts" href="/">
            ←
          </Link>
          <div>
            <span>
              {session.templateName.toUpperCase()} · {elapsedMinutes} MIN
            </span>
            <strong>{currentExercise.name}</strong>
          </div>
          <div className={styles.headerProgress}>
            <span>{formatSetCount(completedSets)} logged</span>
            <small>
              {session.exercises.filter((exercise) => exercise.status !== "planned").length}
              /{session.exercises.length} exercises finished
            </small>
          </div>
          <button
            disabled={pending || completedSets === 0}
            onClick={() => mutate(() => finishSession(session.id))}
            type="button"
          >
            Finish
          </button>
        </header>

        {message && (
          <div className={styles.errorBanner} role="alert">
            {message}
          </div>
        )}

        <ExerciseHero
          catalog={catalog}
          exercise={currentExercise}
          pending={pending}
          session={session}
          mutate={mutate}
          moveAfterSkip={moveAfterSkip}
          unitSystem={unitSystem}
        />

        <SetLedger
          exercise={currentExercise}
          mutate={mutate}
          pending={pending}
          sessionId={session.id}
          unitSystem={unitSystem}
        />

        <ExerciseGrid
          currentExerciseId={currentExercise.id}
          exercises={session.exercises}
          jumpTo={jumpTo}
          unitSystem={unitSystem}
        />
        <PrimaryNav active="session" activeSessionId={session.id} dayEndsAt={dayEndsAt} />
      </section>
    </main>
  );
}

function ExerciseHero({
  catalog,
  exercise,
  moveAfterSkip,
  mutate,
  pending,
  session,
  unitSystem,
}: {
  catalog: SwapExerciseOption[];
  exercise: ActiveExercise;
  moveAfterSkip: () => void;
  mutate: (
    action: () => Promise<SessionMutationResult>,
    afterSuccess?: () => void,
  ) => void;
  pending: boolean;
  session: ActiveSession;
  unitSystem: UnitSystem;
}) {
  const [replacementId, setReplacementId] = useState("");
  const current = completedPerformance(exercise);
  const comparison = comparePerformance(
    current,
    exercise.previous,
    exercise.trackingType,
    unitSystem,
  );
  const plan = projectSetPlan(exercise.sets, exercise.targetSets);
  const canChange = !exercise.sets.some((set) => set.status === "completed");
  const options = catalog.filter(
    (option) =>
      option.id !== exercise.exerciseId &&
      !session.exercises.some((item) => item.exerciseId === option.id),
  );

  return (
    <>
      <section className={styles.exerciseTitle}>
        <div>
          <p>
            Exercise {exercise.position + 1} of {session.exercises.length}
          </p>
          <h1>{exercise.name}</h1>
          <span>{trackingLabel(exercise.trackingType)}</span>
        </div>
        <details className={styles.exerciseMenu}>
          <summary aria-label="Exercise options">•••</summary>
          <div>
            <strong>Change today only</strong>
            <p>The saved workout template stays unchanged.</p>
            <select
              aria-label="Replacement exercise"
              disabled={!canChange || pending}
              onChange={(event) => setReplacementId(event.target.value)}
              value={replacementId}
            >
              <option value="">Choose replacement</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
            <button
              disabled={!canChange || pending || !replacementId}
              onClick={() =>
                mutate(() =>
                  swapExercise({
                    replacementExerciseId: replacementId,
                    sessionExerciseId: exercise.id,
                    sessionId: session.id,
                  }),
                )
              }
              type="button"
            >
              Swap exercise
            </button>
            <button
              className={styles.skipButton}
              disabled={!canChange || pending}
              onClick={() =>
                mutate(
                  () =>
                    skipExercise({
                      sessionExerciseId: exercise.id,
                      sessionId: session.id,
                    }),
                  moveAfterSkip,
                )
              }
              type="button"
            >
              Skip this exercise
            </button>
            {!canChange && <small>Logged sets keep this exercise locked.</small>}
          </div>
        </details>
      </section>

      <section className={styles.performanceRail}>
        <div>
          <span>Previous</span>
          <strong>{formatReps(exercise.previous.reps)}</strong>
          <small>{formatPerformanceLoad(exercise, unitSystem)}</small>
        </div>
        <i>→</i>
        <div>
          <span>Planned target</span>
          <strong>{plannedTargetLabel(exercise)}</strong>
          <small>{formatSetCount(exercise.targetSets, "planned")}</small>
        </div>
        <div className={styles.livePerformance}>
          <span>Today</span>
          <strong>{planTokens(plan).join(" / ") || "—"}</strong>
          <small>
            {planOutcomeLabel(plan)} · {comparison.label}
          </small>
        </div>
      </section>
    </>
  );
}

function SetLedger({
  exercise,
  mutate,
  pending,
  sessionId,
  unitSystem,
}: {
  exercise: ActiveExercise;
  mutate: (action: () => Promise<SessionMutationResult>) => void;
  pending: boolean;
  sessionId: string;
  unitSystem: UnitSystem;
}) {
  const plan = projectSetPlan(exercise.sets, exercise.targetSets);
  const canAddExtra = canAddExtraSet(exercise.sets);
  const resolved = exercise.sets.filter((set) => set.status !== "planned");
  const activeSet = exercise.sets.find((set) => set.status === "planned");

  return (
    <section className={styles.setLedger}>
      {resolved.map((set) =>
        set.status === "completed" ? (
          <button
            className={styles.completedSet}
            disabled={pending}
            key={set.id}
            onClick={() => mutate(() => reopenSet({ sessionId, setId: set.id }))}
            type="button"
          >
            <span>✓</span>
            <small>{setName(set, exercise.targetSets)}</small>
            <strong>{setResultLabel(exercise, set.loadKg, set.reps, unitSystem)}</strong>
            <i>Edit</i>
          </button>
        ) : (
          <div className={styles.skippedSet} key={set.id}>
            <span>×</span>
            <small>{setName(set, exercise.targetSets)}</small>
            <strong>Skipped</strong>
            {set.isPlanned && (
              <button
                disabled={pending}
                onClick={() =>
                  mutate(() => restoreSkippedSet({ sessionId, setId: set.id }))
                }
                type="button"
              >
                Restore
              </button>
            )}
          </div>
        ),
      )}

      {plan.plannedSlots
        .filter((slot) => slot.synthetic)
        .map((slot) => (
          <div className={styles.skippedSet} key={`missing-${slot.position}`}>
            <span>×</span>
            <small>Planned set {slot.position + 1}</small>
            <strong>Skipped</strong>
            <button
              disabled={pending}
              onClick={() =>
                mutate(() =>
                  restoreMissingPlannedSet({
                    position: slot.position,
                    sessionExerciseId: exercise.id,
                    sessionId,
                  }),
                )
              }
              type="button"
            >
              Restore
            </button>
          </div>
        ))}

      {exercise.status === "skipped" ? (
        <div className={styles.skippedState}>
          <span>Skipped today</span>
          <p>Choose another exercise below to keep training.</p>
        </div>
      ) : activeSet ? (
        <ActiveSetEditor
          exercise={exercise}
          key={activeSet.id}
          mutate={mutate}
          pending={pending}
          sessionId={sessionId}
          set={activeSet}
          unitSystem={unitSystem}
        />
      ) : (
        <div className={styles.exerciseComplete}>
          <span>Exercise finished</span>
          <strong>{planOutcomeLabel(plan)}</strong>
        </div>
      )}

      {exercise.status !== "skipped" && (
        <button
          className={styles.addSet}
          disabled={pending || !canAddExtra}
          onClick={() =>
            mutate(() =>
              addExtraSet({
                sessionExerciseId: exercise.id,
                sessionId,
              }),
            )
          }
          type="button"
        >
          {canAddExtra
            ? "+ Add extra set"
            : "Complete extra set to add another"}
        </button>
      )}
    </section>
  );
}

function ActiveSetEditor({
  exercise,
  mutate,
  pending,
  sessionId,
  set,
  unitSystem,
}: {
  exercise: ActiveExercise;
  mutate: (action: () => Promise<SessionMutationResult>) => void;
  pending: boolean;
  sessionId: string;
  set: ActiveExercise["sets"][number];
  unitSystem: UnitSystem;
}) {
  const previousLoad = exercise.previous.loadKg;
  const [load, setLoad] = useState(
    set.loadKg === null
      ? previousLoad === null
        ? ""
        : String(toDisplayLoad(previousLoad, unitSystem))
      : String(toDisplayLoad(set.loadKg, unitSystem)),
  );
  const [reps, setReps] = useState(set.reps === null ? "" : String(set.reps));
  const loadRequired = exercise.trackingType !== "bodyweight_reps";
  const nonSkippedSets = exercise.sets.filter(
    (item) => item.status !== "skipped",
  ).length;
  const removeLabel = removalActionLabel({ isPlanned: set.isPlanned });
  const canComplete =
    reps !== "" && (!loadRequired || (load !== "" && Number(load) >= 0));

  return (
    <div className={styles.activeSet}>
      <header>
        <span>{setName(set, exercise.targetSets)}</span>
        <small>
          Previous: {exercise.previous.reps[set.position] ?? "—"} reps
        </small>
      </header>
      <div className={styles.setInputs}>
        {loadRequired ? (
          <label>
            <span>{loadLabel(exercise.trackingType)}</span>
            <div>
              <input
                aria-label={loadLabel(exercise.trackingType)}
                inputMode="decimal"
                min="0"
                onChange={(event) => setLoad(event.target.value)}
                step={unitSystem === "imperial" ? "0.5" : "0.25"}
                type="number"
                value={load}
              />
              <small>{loadUnit(unitSystem)}</small>
            </div>
          </label>
        ) : (
          <div className={styles.bodyweightField}>
            <span>Load</span>
            <strong>Bodyweight</strong>
          </div>
        )}
        <label>
          <span>Reps</span>
          <input
            aria-label="Reps"
            inputMode="numeric"
            min="0"
            onChange={(event) => setReps(event.target.value)}
            placeholder="0"
            type="number"
            value={reps}
          />
        </label>
      </div>
      <button
        className={styles.completeSet}
        disabled={pending || !canComplete}
        onClick={() =>
          mutate(() =>
            completeSet({
              loadKg: loadRequired ? toKilograms(Number(load), unitSystem) : null,
              reps: Number(reps),
              sessionId,
              setId: set.id,
            }),
          )
        }
        type="button"
      >
        Complete set <span>✓</span>
      </button>
      <button
        className={styles.removeSet}
        disabled={pending || nonSkippedSets <= 1}
        onClick={() =>
          mutate(() => removeWorkingSet({ sessionId, setId: set.id }))
        }
        type="button"
      >
        {removeLabel}
      </button>
      {set.isPlanned && nonSkippedSets > 1 && (
        <small className={styles.removeConsequence}>
          The planned slot stays visible as skipped and does not count toward
          performance.
        </small>
      )}
    </div>
  );
}

function ExerciseGrid({
  currentExerciseId,
  exercises,
  jumpTo,
  unitSystem,
}: {
  currentExerciseId: string;
  exercises: ActiveExercise[];
  jumpTo: (exerciseId: string) => void;
  unitSystem: UnitSystem;
}) {
  const finishedCount = exercises.filter(
    (exercise) => exercise.status !== "planned",
  ).length;

  return (
    <section className={styles.exerciseOverview}>
      <header>
        <div>
          <span>Session exercises</span>
          <strong>
            {finishedCount} / {exercises.length} finished
          </strong>
        </div>
        <small>Tap any exercise to jump</small>
      </header>
      <div className={styles.exerciseGrid}>
        {exercises.map((exercise) => {
          const plan = projectSetPlan(exercise.sets, exercise.targetSets);
          const completed = exercise.sets.filter(
            (set) => set.status === "completed",
          );
          const load = completed.find((set) => set.loadKg !== null)?.loadKg;

          return (
            <button
              className={`${styles.exerciseTile} ${
                exercise.id === currentExerciseId ? styles.currentTile : ""
              } ${
                exercise.status === "completed" ? styles.completeTile : ""
              } ${exercise.status === "skipped" ? styles.skippedTile : ""}`}
              key={exercise.id}
              onClick={() => jumpTo(exercise.id)}
              type="button"
            >
              <span>{String(exercise.position + 1).padStart(2, "0")}</span>
              <strong>{exercise.name}</strong>
              <small>
                {exercise.trackingType === "bodyweight_reps"
                  ? "Bodyweight"
                  : `${formatDisplayLoad(load ?? exercise.previous.loadKg, unitSystem)} ${loadUnit(unitSystem)}`}
              </small>
              <b>{planTokens(plan).join(" / ") || "Open plan"}</b>
              <em>{planOutcomeLabel(plan)}</em>
              {exercise.status === "completed" && <i>✓</i>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function targetLabel(exercise: ActiveExercise) {
  if (exercise.targetRepMin === null && exercise.targetRepMax === null) return "Open";
  if (exercise.targetRepMin === exercise.targetRepMax) {
    const reps = exercise.targetRepMin ?? exercise.targetRepMax;
    return `${reps} ${reps === 1 ? "rep" : "reps"}`;
  }
  return `${exercise.targetRepMin ?? "—"}–${exercise.targetRepMax ?? "—"} reps`;
}

function plannedTargetLabel(exercise: ActiveExercise) {
  return `${exercise.targetSets} × ${targetLabel(exercise)}`;
}

function setName(
  set: ActiveExercise["sets"][number],
  targetSets: number,
) {
  return set.isPlanned
    ? `Planned set ${set.position + 1}`
    : `Extra set ${Math.max(1, set.position - targetSets + 1)}`;
}

function trackingLabel(type: ActiveExercise["trackingType"]) {
  const labels: Record<ActiveExercise["trackingType"], string> = {
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

function loadLabel(type: ActiveExercise["trackingType"]) {
  if (type === "assistance_reps") return "Assistance";
  if (type === "added_weight_reps") return "Added weight";
  return "Weight";
}

function formatPerformanceLoad(exercise: ActiveExercise, unitSystem: UnitSystem) {
  if (exercise.trackingType === "bodyweight_reps") return "Bodyweight";
  return `${formatDisplayLoad(exercise.previous.loadKg, unitSystem)} ${loadUnit(unitSystem)}`;
}

function setResultLabel(
  exercise: ActiveExercise,
  loadKg: number | null,
  reps: number | null,
  unitSystem: UnitSystem,
) {
  if (exercise.trackingType === "bodyweight_reps") return `${reps ?? "—"} reps`;
  return `${formatDisplayLoad(loadKg, unitSystem)} ${loadUnit(unitSystem)} × ${reps ?? "—"}`;
}

function minutesSince(startedAt: string) {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(startedAt).getTime()) / 60_000),
  );
}

function formatSetCount(count: number, qualifier?: string) {
  return `${count} ${qualifier ? `${qualifier} ` : ""}${count === 1 ? "set" : "sets"}`;
}
