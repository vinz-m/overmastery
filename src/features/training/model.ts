export type SetEntry = {
  id: string;
  weightKg: string;
  reps: string;
  completed: boolean;
};

export type ExercisePerformance = {
  weightKg: number;
  reps: number[];
};

export type SessionExercise = {
  id: string;
  exerciseId: string;
  name: string;
  detail: string;
  target: ExercisePerformance;
  previous: ExercisePerformance;
  sets: SetEntry[];
};

export type TrainingSession = {
  id: string;
  templateName: string;
  startedAt: number;
  exercises: SessionExercise[];
};

export type Comparison = {
  state: "improved" | "matched" | "declined" | "not-comparable";
  label: string;
  deltaReps: number | null;
};

export function comparePerformance(
  current: ExercisePerformance | null,
  previous: ExercisePerformance,
): Comparison {
  if (!current || current.reps.length === 0) {
    return { state: "not-comparable", label: "No completed sets", deltaReps: null };
  }

  if (current.weightKg !== previous.weightKg) {
    if (current.weightKg > previous.weightKg) {
      return {
        state: "improved",
        label: `+${formatWeight(current.weightKg - previous.weightKg)} kg`,
        deltaReps: null,
      };
    }
    return {
      state: "not-comparable",
      label: `${formatWeight(current.weightKg)} kg today`,
      deltaReps: null,
    };
  }

  const total = current.reps.reduce((sum, reps) => sum + reps, 0);
  const previousComparable = previous.reps.slice(0, current.reps.length);
  const previousTotal = previousComparable.reduce((sum, reps) => sum + reps, 0);
  const delta = total - previousTotal;

  if (delta > 0) return { state: "improved", label: `+${delta} total ${delta === 1 ? "rep" : "reps"}`, deltaReps: delta };
  if (delta < 0) return { state: "declined", label: `${Math.abs(delta)} fewer ${Math.abs(delta) === 1 ? "rep" : "reps"}`, deltaReps: delta };
  return { state: "matched", label: "Matched previous", deltaReps: 0 };
}

export function performanceFromSets(sets: SetEntry[]): ExercisePerformance | null {
  const completed = sets.filter((set) => set.completed);
  if (completed.length === 0) return null;

  const weightKg = Number(completed[0].weightKg);
  if (!completed.every((set) => Number(set.weightKg) === weightKg)) return null;

  return { weightKg, reps: completed.map((set) => Number(set.reps)) };
}

export function formatPerformance(performance: ExercisePerformance) {
  return performance.reps.join(" / ");
}

export function formatWeight(weight: number) {
  return Number.isInteger(weight) ? String(weight) : weight.toFixed(1);
}
