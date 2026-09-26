import { toDisplayLoad, type UnitSystem } from "../../lib/units.ts";
import { formatSessionDate } from "./format.ts";
import type { ExerciseTimeline } from "./types";

/** What the weight line talks about; null when the exercise has no load. */
type LoadKind = "added" | "assistance" | "weight" | null;

type Exposure = {
  endedAt: string;
  /** In the exercise's unit; 0 for an added-weight exercise done without any. */
  load: number | null;
  sets: number[];
};

export type ExerciseProgress = {
  /** "Up 10 lb since Aug 30, with 2 more reps at 220 lb." */
  headline: string;
  /** e.g. { label: "Weight", value: "210 → 220 lb" }. */
  details: Array<{ label: string; note?: string; value: string }>;
};

/**
 * How an exercise has progressed, in plain words and the terms lifters use:
 * the weight went up, or the reps went up at the same weight. Needs two times
 * to compare. The weight is the working weight shown everywhere else.
 *
 * Plain TypeScript with no rendering, so any client can show it.
 */
export function buildExerciseProgress(
  timeline: ExerciseTimeline,
): ExerciseProgress | null {
  const kind = loadKind(timeline);
  if (kind === undefined) return null;

  const unitSystem: UnitSystem = timeline.exposures[0]?.displayUnit ?? "metric";
  const unit = unitSystem === "imperial" ? "lb" : "kg";
  const exposures = [...timeline.exposures]
    .reverse()
    .filter((exposure) => exposure.reps.length > 0)
    .map((exposure): Exposure => ({
      endedAt: exposure.endedAt,
      load:
        exposure.loadKg === null
          ? kind === "added"
            ? 0
            : null
          : Math.round(toDisplayLoad(exposure.loadKg, unitSystem) * 10) / 10,
      sets: exposure.reps,
    }));
  if (exposures.length < 2) return null;

  const first = exposures[0];
  const latest = exposures.at(-1)!;
  // Reps only compare at the same weight and set count; a heavier weight or a
  // skipped set changes what the number means.
  const base = exposures.find(
    (exposure) =>
      exposure.load === latest.load &&
      exposure.sets.length === latest.sets.length,
  )!;

  const details: ExerciseProgress["details"] = [];
  if (kind && first.load !== null && latest.load !== null)
    details.push({
      label: loadLabel(kind),
      value: loadDetail(first.load, latest.load, unit),
    });
  details.push({
    label: repsLabel(kind, latest.load, unit),
    ...repsDetail(exposures, base, latest, kind),
  });

  return {
    details,
    headline: headline(first, latest, base, kind, unit),
  };
}

function loadKind(timeline: ExerciseTimeline): LoadKind | undefined {
  if (timeline.trackingType === "weight_reps") return "weight";
  if (timeline.trackingType === "assistance_reps") return "assistance";
  if (timeline.trackingType === "bodyweight_reps")
    return timeline.exposures.some((exposure) => exposure.loadKg)
      ? "added"
      : null;
  return undefined;
}

/**
 * One plain sentence, no symbols: "Up 10 lb since Aug 30.", "2 more reps at
 * 55 kg since Sep 3.", or both joined with "with".
 */
function headline(
  first: Exposure,
  latest: Exposure,
  base: Exposure,
  kind: LoadKind,
  unit: string,
) {
  const loadChange = kind ? loadDifference(first, latest) : 0;
  const load =
    kind && loadChange !== 0 ? loadPhrase(loadChange, kind, unit) : null;
  const repChange = base === latest ? 0 : total(latest.sets) - total(base.sets);
  const reps =
    repChange === 0
      ? null
      : `${Math.abs(repChange)} ${repChange > 0 ? "more" : "fewer"} ${Math.abs(repChange) === 1 ? "rep" : "reps"}${kind && latest.load !== null ? ` at ${formatNumber(latest.load)} ${unit}` : ""}`;
  const since = (exposure: Exposure) =>
    `since ${formatSessionDate(exposure.endedAt)}`;

  if (load && reps) return `${load} ${since(first)}, with ${reps}.`;
  if (load) return `${load} ${since(first)}.`;
  // Reps are compared from the first time at this weight, which may be later.
  if (reps) return `${reps} ${since(base)}.`;
  if (base !== latest)
    return `Same ${kind ? "weight and reps" : "reps"} ${since(base)}.`;
  return kind
    ? `Same weight ${since(first)}.`
    : `Different number of sets than ${formatSessionDate(first.endedAt)}.`;
}

function loadLabel(kind: Exclude<LoadKind, null>) {
  if (kind === "assistance") return "Assistance";
  return kind === "added" ? "Added weight" : "Weight";
}

/** "210 → 220 lb", or "Still 60 kg"; the headline says by how much. */
function loadDetail(from: number, to: number, unit: string) {
  if (Math.round((to - from) * 10) === 0)
    return `Still ${formatNumber(to)} ${unit}`;
  return `${formatNumber(from)} → ${formatNumber(to)} ${unit}`;
}

/**
 * "10 / 10 → 11 / 11", or the latest reps with a short note, shown on its own
 * line under them, saying what they can't be compared with.
 */
function repsDetail(
  exposures: Exposure[],
  base: Exposure,
  latest: Exposure,
  kind: LoadKind,
) {
  const value = latest.sets.join(" / ");
  if (base === latest) {
    // Nothing earlier matches both the weight and the number of sets.
    const lastAtLoad = exposures
      .filter((exposure) => exposure !== latest)
      .findLast((exposure) => exposure.load === latest.load);
    if (lastAtLoad) {
      const change =
        latest.sets.length < lastAtLoad.sets.length ? "Fewer" : "More";
      const at = !kind
        ? ""
        : kind === "assistance"
          ? " with this assistance"
          : " at this weight";
      return { note: `${change} sets than last time${at}.`, value };
    }
    if (!kind) return { value };
    return {
      note:
        kind === "assistance"
          ? "First time with this assistance."
          : "First time at this weight.",
      value,
    };
  }
  const baseSets = base.sets.join(" / ");
  if (baseSets === value)
    return { note: `Same as ${formatSessionDate(base.endedAt)}.`, value };
  return { value: `${baseSets} → ${value}` };
}

/** "Reps at 55 kg", "Reps with 20 kg assistance", or just "Reps". */
function repsLabel(kind: LoadKind, load: number | null, unit: string) {
  if (!kind || load === null) return "Reps";
  const amount = `${formatNumber(load)} ${unit}`;
  return kind === "assistance"
    ? `Reps with ${amount} assistance`
    : `Reps at ${amount}`;
}

/** "Up 10 lb", "Down 5 kg", or "10 kg less assistance". */
function loadPhrase(
  change: number,
  kind: Exclude<LoadKind, null>,
  unit: string,
) {
  const amount = `${formatNumber(Math.abs(change))} ${unit}`;
  if (kind === "assistance")
    return `${amount} ${change < 0 ? "less" : "more"} assistance`;
  return `${change > 0 ? "Up" : "Down"} ${amount}`;
}

function loadDifference(first: Exposure, latest: Exposure) {
  if (first.load === null || latest.load === null) return 0;
  return Math.round((latest.load - first.load) * 10) / 10;
}

function total(sets: number[]) {
  return sets.reduce((sum, reps) => sum + reps, 0);
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
