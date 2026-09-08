import type { ExerciseTrackingType, WorkoutExerciseDraft } from "./types";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isWorkoutId(value: string) {
  return uuidPattern.test(value);
}

export function readWorkoutDraft(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 30) return null;

    const rows: WorkoutExerciseDraft[] = [];
    const exerciseIds = new Set<string>();
    for (const item of parsed) {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const id = typeof row.id === "string" ? row.id : "";
      const targetSets = Number(row.targetSets);
      const targetRepMin = Number(row.targetRepMin);
      const targetRepMax = Number(row.targetRepMax);
      const defaultRestSeconds = Number(row.defaultRestSeconds);
      if (
        !isWorkoutId(id) || exerciseIds.has(id) ||
        !Number.isInteger(targetSets) || targetSets < 1 || targetSets > 20 ||
        !Number.isInteger(targetRepMin) || targetRepMin < 1 || targetRepMin > 100 ||
        !Number.isInteger(targetRepMax) || targetRepMax < targetRepMin || targetRepMax > 100 ||
        !Number.isInteger(defaultRestSeconds) || defaultRestSeconds < 0 || defaultRestSeconds > 3600
      ) return null;

      exerciseIds.add(id);
      rows.push({
        defaultRestSeconds,
        id,
        isCustom: Boolean(row.isCustom),
        name: typeof row.name === "string" ? row.name : "",
        targetRepMax,
        targetRepMin,
        targetSets,
        trackingType: (typeof row.trackingType === "string" ? row.trackingType : "weight_reps") as ExerciseTrackingType,
      });
    }
    return rows;
  } catch {
    return null;
  }
}
