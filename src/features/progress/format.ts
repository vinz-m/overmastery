import type { TrackingType } from "@/features/sessions/types";

import { formatReps } from "@/features/sessions/performance";
import { formatDisplayLoad, loadUnit, type UnitSystem } from "@/lib/units";

export function formatPerformance(
  trackingType: TrackingType,
  loadKg: number | null,
  reps: number[],
  unitSystem: UnitSystem,
) {
  if (trackingType === "bodyweight_reps") return `${formatReps(reps)} reps`;
  const noun = trackingType === "assistance_reps" ? `${loadUnit(unitSystem)} assistance` : loadUnit(unitSystem);
  return `${formatDisplayLoad(loadKg, unitSystem)} ${noun} · ${formatReps(reps)}`;
}

export function formatSessionDate(value: string, long = false) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: long ? "long" : "short",
    year: long ? "numeric" : undefined,
  }).format(new Date(value));
}

export function formatDuration(startedAt: string, endedAt: string) {
  const minutes = Math.max(
    1,
    Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000),
  );
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}
