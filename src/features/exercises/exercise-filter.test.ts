import assert from "node:assert/strict";
import test from "node:test";

import { filterExercises, groupExercises } from "./exercise-filter.ts";

const exercises = [
  {
    id: "library-bench",
    isCustom: false,
    name: "Barbell Bench Press",
    primaryMuscle: { name: "Chest", slug: "chest" },
    trackingType: "weight_reps" as const,
  },
  {
    id: "custom-row",
    isCustom: true,
    name: "Low Cable Row",
    trackingType: "weight_reps" as const,
  },
  {
    id: "archived-curl",
    isArchived: true,
    isCustom: true,
    name: "Cable Curl",
    trackingType: "weight_reps" as const,
  },
  {
    id: "library-row",
    isCustom: false,
    name: "Pendlay Row",
    primaryMuscle: { name: "Back", slug: "back" },
    trackingType: "weight_reps" as const,
  },
];

test("source filters separate custom and library exercises", () => {
  assert.deepEqual(
    filterExercises(exercises, "", "custom").map((exercise) => exercise.id),
    ["custom-row"],
  );
  assert.deepEqual(
    filterExercises(exercises, "", "library").map((exercise) => exercise.id),
    ["library-bench", "library-row"],
  );
  assert.deepEqual(
    filterExercises(exercises, "", "archived").map((exercise) => exercise.id),
    ["archived-curl"],
  );
  assert.equal(filterExercises(exercises, "", "all").includes(exercises[2]), false);
});

test("search is combined with the selected source", () => {
  assert.deepEqual(
    filterExercises(exercises, " row ", "library").map(
      (exercise) => exercise.id,
    ),
    ["library-row"],
  );
  assert.deepEqual(
    filterExercises(exercises, "ROW", "all").map((exercise) => exercise.id),
    ["custom-row", "library-row"],
  );
});

test("groups exercises by primary muscle with custom exercises first", () => {
  const groups = groupExercises(exercises);

  assert.deepEqual(
    groups.map((group) => [group.key, group.label, group.exercises.length]),
    [
      ["custom", "Custom exercises", 1],
      ["archived", "Archived exercises", 1],
      ["chest", "Chest", 1],
      ["back", "Back", 1],
    ],
  );
});
