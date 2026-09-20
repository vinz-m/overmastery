import type { ExerciseCatalogItem } from "@/features/workouts/types";

export type ExerciseSourceFilter = "all" | "archived" | "custom" | "library";

export type ExerciseGroup = {
  exercises: ExerciseCatalogItem[];
  key: string;
  label: string;
};

const muscleOrder = [
  "custom",
  "archived",
  "chest",
  "back",
  "shoulders",
  "quadriceps",
  "hamstrings",
  "glutes",
  "biceps",
  "triceps",
  "calves",
  "core",
  "other",
];

export function filterExercises(
  exercises: readonly ExerciseCatalogItem[],
  search: string,
  source: ExerciseSourceFilter,
) {
  const query = search.trim().toLocaleLowerCase();

  return exercises.filter((exercise) => {
    const matchesSource =
      source === "archived"
        ? Boolean(exercise.isArchived)
        : !exercise.isArchived &&
          (source === "all" ||
            (source === "custom" ? exercise.isCustom : !exercise.isCustom));
    const matchesSearch =
      !query || exercise.name.toLocaleLowerCase().includes(query);

    return matchesSource && matchesSearch;
  });
}

export function groupExercises(
  exercises: readonly ExerciseCatalogItem[],
): ExerciseGroup[] {
  const grouped = new Map<string, ExerciseGroup>();

  for (const exercise of exercises) {
    const key = exercise.isArchived
      ? "archived"
      : exercise.isCustom
      ? "custom"
      : exercise.primaryMuscle?.slug ?? "other";
    const label = exercise.isArchived
      ? "Archived exercises"
      : exercise.isCustom
      ? "Custom exercises"
      : exercise.primaryMuscle?.name ?? "Other exercises";
    const group = grouped.get(key) ?? { exercises: [], key, label };
    group.exercises.push(exercise);
    grouped.set(key, group);
  }

  return [...grouped.values()].sort((left, right) => {
    const leftIndex = muscleOrder.indexOf(left.key);
    const rightIndex = muscleOrder.indexOf(right.key);
    const normalizedLeft = leftIndex === -1 ? muscleOrder.length : leftIndex;
    const normalizedRight = rightIndex === -1 ? muscleOrder.length : rightIndex;
    return normalizedLeft - normalizedRight || left.label.localeCompare(right.label);
  });
}
