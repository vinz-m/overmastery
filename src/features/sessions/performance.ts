import type {
  ActiveExercise,
  PreviousPerformance,
  TrackingType,
} from "./types";
import {
  formatDisplayDelta,
  formatDisplayLoad,
  loadUnit,
  type UnitSystem,
} from "../../lib/units.ts";

export type PerformanceComparison = {
  label: string;
  state: "improved" | "matched" | "declined" | "new" | "notComparable";
};

export function completedPerformance(
  exercise: Pick<ActiveExercise, "sets" | "trackingType">,
): PreviousPerformance | null {
  const completed = exercise.sets
    .filter((set) => set.status === "completed" && set.reps !== null)
    .sort((left, right) => left.position - right.position);

  if (completed.length === 0) return null;

  return {
    loadKg: completed[0]?.loadKg ?? null,
    reps: completed.map((set) => set.reps!),
    unit: completed[0]?.enteredUnit ?? null,
  };
}

export function comparePerformance(
  current: PreviousPerformance | null,
  previous: PreviousPerformance,
  trackingType: TrackingType,
  unitSystem: UnitSystem = "metric",
): PerformanceComparison {
  if (!current) return { label: "No completed sets", state: "new" };
  if (previous.reps.length === 0) {
    return { label: "First time logged", state: "new" };
  }

  const currentLoad = current.loadKg ?? 0;
  const previousLoad = previous.loadKg ?? 0;
  if (currentLoad !== previousLoad) {
    const loadImproved =
      trackingType === "assistance_reps"
        ? currentLoad < previousLoad
        : currentLoad > previousLoad;

    const currentReps = current.reps.reduce((sum, reps) => sum + reps, 0);
    const previousReps = previous.reps.reduce((sum, reps) => sum + reps, 0);

    if (loadImproved && currentReps >= previousReps) {
      return {
        label: `${formatDisplayDelta(currentLoad - previousLoad, unitSystem)} ${loadUnit(unitSystem)}`,
        state: "improved",
      };
    }

    return {
      label: "Can’t compare to last time",
      state: "notComparable",
    };
  }

  const currentTotal = current.reps.reduce((sum, reps) => sum + reps, 0);
  const previousTotal = previous.reps
    .slice(0, current.reps.length)
    .reduce((sum, reps) => sum + reps, 0);
  const difference = currentTotal - previousTotal;

  if (difference > 0) {
    return {
      label: `+${difference} total ${difference === 1 ? "rep" : "reps"}`,
      state: "improved",
    };
  }
  if (difference < 0) {
    const absolute = Math.abs(difference);
    return {
      label: `${absolute} fewer ${absolute === 1 ? "rep" : "reps"}`,
      state: "declined",
    };
  }
  if (
    current.reps.length === previous.reps.length &&
    current.reps.every((reps, index) => reps === previous.reps[index])
  ) {
    return { label: "Matched previous", state: "matched" };
  }

  return { label: "Can’t compare to last time", state: "notComparable" };
}

export function formatLoad(value: number | null) {
  if (value === null) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function formatReps(reps: number[]) {
  return reps.length > 0 ? reps.join(" / ") : "—";
}

export function loadLabel(trackingType: TrackingType) {
  if (trackingType === "assistance_reps") return "Assistance";
  if (trackingType === "bodyweight_reps") return "Added weight";
  return "Weight";
}

/** "80 kg", "+10 kg" on a bodyweight exercise, "30 kg assistance", or null at plain bodyweight. */
export function formatSetLoad(
  trackingType: TrackingType,
  loadKg: number | null,
  unitSystem: UnitSystem,
) {
  const load = `${formatDisplayLoad(loadKg, unitSystem)} ${loadUnit(unitSystem)}`;
  if (trackingType === "bodyweight_reps") return loadKg ? `+${load}` : null;
  return trackingType === "assistance_reps" ? `${load} assistance` : load;
}

export function formatPerformance(
  trackingType: TrackingType,
  loadKg: number | null,
  reps: number[],
  unitSystem: UnitSystem,
) {
  const load = formatSetLoad(trackingType, loadKg, unitSystem);
  return load ? `${load} · ${formatReps(reps)}` : `${formatReps(reps)} reps`;
}
