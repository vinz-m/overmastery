type WorkoutTrainingHistory = {
  lastTrainedAt?: string | null;
};

export function selectNextWorkout<TWorkout extends WorkoutTrainingHistory>(
  workouts: readonly TWorkout[],
) {
  return workouts.reduce<TWorkout | undefined>((next, workout) => {
    if (!next) return workout;

    return trainingTime(workout.lastTrainedAt) <
      trainingTime(next.lastTrainedAt)
      ? workout
      : next;
  }, undefined);
}

function trainingTime(value: string | null | undefined) {
  if (!value) return Number.NEGATIVE_INFINITY;

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}
