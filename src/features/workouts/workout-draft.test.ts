import assert from "node:assert/strict";
import test from "node:test";

import { readWorkoutDraft } from "./workout-draft.ts";

const exercise = {
  defaultRestSeconds: 120,
  id: "123e4567-e89b-42d3-a456-426614174000",
  targetRepMax: 12,
  targetRepMin: 8,
  targetSets: 3,
  trackingType: "weight_reps",
};

test("accepts and preserves a valid ordered workout draft", () => {
  const result = readWorkoutDraft(JSON.stringify([exercise]));
  assert.equal(result?.length, 1);
  assert.equal(result?.[0].targetRepMin, 8);
});

test("rejects duplicate exercises", () => {
  assert.equal(readWorkoutDraft(JSON.stringify([exercise, exercise])), null);
});

test("rejects invalid set, rep, and rest configuration", () => {
  assert.equal(readWorkoutDraft(JSON.stringify([{ ...exercise, targetSets: 0 }])), null);
  assert.equal(readWorkoutDraft(JSON.stringify([{ ...exercise, targetRepMax: 7 }])), null);
  assert.equal(readWorkoutDraft(JSON.stringify([{ ...exercise, defaultRestSeconds: 3601 }])), null);
});
