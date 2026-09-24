import type { UnitSystem } from "../../lib/units.ts";
import type { PreviousPerformance } from "./types";

type PrefillSet = {
  enteredUnit?: UnitSystem | null;
  loadKg: number | null;
  plannedReps?: number | null;
  position: number;
  reps: number | null;
  status: "completed" | "planned" | "skipped";
};

export type SetPrefill = {
  loadKg: number | null;
  reps: number | null;
  /** Unit to show the load in; null means the profile default. */
  unit: UnitSystem | null;
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
 *
 * The unit follows the load it came with, so an exercise done on a lb-only
 * machine keeps starting in lb.
 */
export function prefillForSet(
  set: PrefillSet,
  sets: PrefillSet[],
  previous: PreviousPerformance,
): SetPrefill {
  const lastCompleted = sets
    .filter(
      (item) => item.status === "completed" && item.position < set.position,
    )
    .sort((left, right) => right.position - left.position)[0];
  const previousReps =
    previous.reps[set.position] ??
    previous.reps[previous.reps.length - 1] ??
    null;

  const fallback: SetPrefill = lastCompleted
    ? {
        loadKg: lastCompleted.loadKg,
        reps: lastCompleted.reps,
        unit: lastCompleted.enteredUnit ?? null,
      }
    : {
        loadKg: previous.loadKg,
        reps: previousReps ?? set.plannedReps ?? null,
        unit: previous.unit ?? null,
      };

  return {
    loadKg: set.loadKg ?? fallback.loadKg,
    reps: set.reps ?? fallback.reps,
    unit: set.loadKg !== null ? (set.enteredUnit ?? null) : fallback.unit,
  };
}
