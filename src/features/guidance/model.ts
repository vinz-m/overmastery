export const guidanceKeys = [
  "home.overview.v1",
  "workouts.overview.v1",
  "progress.overview.v1",
  "profile.overview.v1",
  "workout-builder.add-exercise.v1",
  "workout-builder.configure-exercise.v1",
  "workout-builder.save-workout.v1",
] as const;

export type GuidanceKey = (typeof guidanceKeys)[number];
export type GuidanceOutcome = "completed" | "dismissed";

export type GuidanceState = {
  completed: GuidanceKey[];
  dismissed: GuidanceKey[];
};

export const emptyGuidanceState: GuidanceState = {
  completed: [],
  dismissed: [],
};

export function readGuidanceState(metadata: unknown): GuidanceState {
  if (!metadata || typeof metadata !== "object") return emptyGuidanceState;

  const raw = (metadata as Record<string, unknown>).overmastery_guidance;
  if (!raw || typeof raw !== "object") return emptyGuidanceState;

  const record = raw as Record<string, unknown>;
  const validKeys = new Set<string>(guidanceKeys);
  const readKeys = (value: unknown) =>
    Array.isArray(value)
      ? value.filter(
          (key): key is GuidanceKey =>
            typeof key === "string" && validKeys.has(key),
        )
      : [];

  return {
    completed: readKeys(record.completed),
    dismissed: readKeys(record.dismissed),
  };
}

export function hasSeenGuidance(state: GuidanceState, key: GuidanceKey) {
  return state.completed.includes(key) || state.dismissed.includes(key);
}
