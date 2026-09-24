import type { PreviousPerformance } from "./types";

type PrefillSet = {
  loadKg: number | null;
  plannedReps?: number | null;
  position: number;
  reps: number | null;
  status: "completed" | "planned" | "skipped";
};

export type SetPrefill = {
  loadKg: number | null;
  reps: number | null;
};

/**
 * Picks the starting values for the set being logged.
 *
 * 1. Values already on the set win (a reopened set keeps what was logged).
 * 2. Otherwise carry forward the latest completed set of this exercise today,
 *    so a weight or rep change follows into the next set.
 * 3. Otherwise start from the previous session's matching set.
 * 4. With no history, reps fall back to the workout plan's target and the
 *    load stays empty.
 */
export function prefillForSet(
  set: PrefillSet,
  sets: PrefillSet[],
  previous: PreviousPerformance,
): SetPrefill {
  const lastCompleted = sets
    .filter((item) => item.status === "completed" && item.position < set.position)
    .sort((left, right) => right.position - left.position)[0];
  const previousReps =
    previous.reps[set.position] ?? previous.reps[previous.reps.length - 1] ?? null;

  const fallback: SetPrefill = lastCompleted
    ? { loadKg: lastCompleted.loadKg, reps: lastCompleted.reps }
    : { loadKg: previous.loadKg, reps: previousReps ?? set.plannedReps ?? null };

  return {
    loadKg: set.loadKg ?? fallback.loadKg,
    reps: set.reps ?? fallback.reps,
  };
}
