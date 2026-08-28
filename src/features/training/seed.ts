import type { ExercisePerformance, SessionExercise, TrainingSession } from "./model";

type SeedExercise = Omit<SessionExercise, "sets">;

const exercises: SeedExercise[] = [
  {
    id: "session-exercise-bench",
    exerciseId: "bench-press",
    name: "Bench Press",
    detail: "Barbell · Chest",
    previous: { weightKg: 80, reps: [8, 8, 7] },
    target: { weightKg: 80, reps: [8, 8, 8] },
  },
  {
    id: "session-exercise-row",
    exerciseId: "chest-supported-row",
    name: "Chest Supported Row",
    detail: "Machine · Back",
    previous: { weightKg: 70, reps: [10, 10, 9] },
    target: { weightKg: 70, reps: [10, 10, 10] },
  },
  {
    id: "session-exercise-incline",
    exerciseId: "incline-dumbbell-press",
    name: "Incline DB Press",
    detail: "Dumbbell · Chest · per hand",
    previous: { weightKg: 30, reps: [9, 8, 8] },
    target: { weightKg: 30, reps: [9, 9, 8] },
  },
  {
    id: "session-exercise-pulldown",
    exerciseId: "lat-pulldown",
    name: "Lat Pulldown",
    detail: "Cable · Back",
    previous: { weightKg: 65, reps: [10, 9, 9] },
    target: { weightKg: 65, reps: [10, 10, 9] },
  },
];

function setsFrom(previous: ExercisePerformance, exerciseIndex: number) {
  return previous.reps.map((_, setIndex) => ({
    id: `set-${exerciseIndex + 1}-${setIndex + 1}`,
    weightKg: String(previous.weightKg),
    reps: "",
    completed: false,
  }));
}

export function createSeedSession(previousOverrides?: Record<string, ExercisePerformance>): TrainingSession {
  return {
    id: `session-${Date.now()}`,
    templateName: "Upper A",
    startedAt: Date.now(),
    exercises: exercises.map((exercise, index) => {
      const previous = previousOverrides?.[exercise.exerciseId] ?? exercise.previous;
      return { ...exercise, previous, sets: setsFrom(exercise.target, index) };
    }),
  };
}
