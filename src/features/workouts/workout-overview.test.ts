import assert from "node:assert/strict";
import test from "node:test";

import {
  latestTrainingDate,
  selectNextWorkout,
} from "./workout-overview.ts";

const workouts = [
  { id: "a", lastTrainedAt: "2026-09-12T10:00:00.000Z" },
  { id: "b", lastTrainedAt: "2026-09-10T10:00:00.000Z" },
  { id: "c", lastTrainedAt: null },
];

test("an untrained workout is recommended before repeating the rotation", () => {
  assert.equal(selectNextWorkout(workouts)?.id, "c");
});

test("the least recently trained workout is next after every workout has history", () => {
  assert.equal(selectNextWorkout(workouts.slice(0, 2))?.id, "b");
});

test("last trained reflects the latest session across every workout", () => {
  assert.equal(
    latestTrainingDate([
      "2026-09-10T10:00:00.000Z",
      null,
      "2026-09-12T10:00:00.000Z",
    ]),
    "2026-09-12T10:00:00.000Z",
  );
});
