import type { ExerciseTrackingType } from "./types";

// Bodyweight exercises take optional added weight, so the old
// 'added_weight_reps' type is retired and no longer offered.
export const trackingOptions: { label: string; value: ExerciseTrackingType }[] =
  [
    { label: "Weight + reps", value: "weight_reps" },
    { label: "Bodyweight + reps", value: "bodyweight_reps" },
    { label: "Assistance + reps", value: "assistance_reps" },
  ];

export const supportedTrackingTypes = trackingOptions.map(
  (option) => option.value,
);

const trackingLabels: Record<ExerciseTrackingType, string> = {
  added_weight_reps: "Bodyweight + reps",
  assistance_reps: "Assistance + reps",
  bodyweight_reps: "Bodyweight + reps",
  duration: "Duration",
  weight_distance: "Weight + distance",
  weight_duration: "Weight + duration",
  weight_reps: "Weight + reps",
};

export function trackingLabel(type: ExerciseTrackingType) {
  return trackingLabels[type];
}
