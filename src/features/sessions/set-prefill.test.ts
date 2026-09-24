import assert from "node:assert/strict";
import test from "node:test";

import { prefillForSet } from "./set-prefill.ts";

const noHistory = { loadKg: null, reps: [] };
const lastWorkout = { loadKg: 60, reps: [5, 5, 4] };

function planned(position: number) {
  return { loadKg: null, position, reps: null, status: "planned" as const };
}

function completed(position: number, loadKg: number, reps: number) {
  return { loadKg, position, reps, status: "completed" as const };
}

test("a new user's first set starts empty", () => {
  const set = planned(0);
  assert.deepEqual(prefillForSet(set, [set], noHistory), { loadKg: null, reps: null });
});

test("with no history, reps start from the workout plan's target", () => {
  const set = { ...planned(0), plannedReps: 8 };
  assert.deepEqual(prefillForSet(set, [set], noHistory), { loadKg: null, reps: 8 });
});

test("history reps win over the plan's target", () => {
  const set = { ...planned(0), plannedReps: 8 };
  assert.deepEqual(prefillForSet(set, [set], lastWorkout), { loadKg: 60, reps: 5 });
});

test("the first set starts from the previous session", () => {
  const set = planned(0);
  assert.deepEqual(prefillForSet(set, [set, planned(1)], lastWorkout), { loadKg: 60, reps: 5 });
});

test("the next set carries forward the set just completed", () => {
  const sets = [completed(0, 60, 5), planned(1), planned(2)];
  assert.deepEqual(prefillForSet(sets[1], sets, lastWorkout), { loadKg: 60, reps: 5 });
});

test("an increase carries into the following sets instead of the old history", () => {
  const sets = [completed(0, 62.5, 6), planned(1)];
  assert.deepEqual(prefillForSet(sets[1], sets, lastWorkout), { loadKg: 62.5, reps: 6 });
});

test("the latest earlier set is used when several are completed", () => {
  const sets = [completed(0, 60, 5), completed(1, 65, 3), planned(2)];
  assert.deepEqual(prefillForSet(sets[2], sets, noHistory), { loadKg: 65, reps: 3 });
});

test("a reopened set keeps the values it was logged with", () => {
  const reopened = { loadKg: 55, position: 0, reps: 8, status: "planned" as const };
  const sets = [reopened, completed(1, 60, 5)];
  assert.deepEqual(prefillForSet(reopened, sets, lastWorkout), { loadKg: 55, reps: 8 });
});

test("a set beyond the previous session's count reuses its last reps", () => {
  const set = planned(4);
  assert.deepEqual(prefillForSet(set, [set], lastWorkout), { loadKg: 60, reps: 4 });
});
