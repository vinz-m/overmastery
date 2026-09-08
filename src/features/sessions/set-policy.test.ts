import assert from "node:assert/strict";
import test from "node:test";

import {
  canAddExtraSet,
  exerciseStatusAfterSetChange,
  planOutcomeLabel,
  planTokens,
  projectSetPlan,
  removalActionLabel,
} from "./set-policy.ts";

test("another extra set is blocked until the open extra is completed", () => {
  assert.equal(
    canAddExtraSet([
      { isPlanned: true, status: "completed" },
      { isPlanned: false, status: "planned" },
    ]),
    false,
  );
  assert.equal(
    canAddExtraSet([
      { isPlanned: true, status: "completed" },
      { isPlanned: false, status: "completed" },
    ]),
    true,
  );
});

test("a missing planned row is still shown as a skipped slot", () => {
  const plan = projectSetPlan(
    [
      {
        isPlanned: true,
        position: 0,
        reps: 12,
        status: "completed",
      },
    ],
    2,
  );

  assert.deepEqual(plan.planned, {
    completed: 1,
    open: 0,
    skipped: 1,
    total: 2,
  });
  assert.deepEqual(planTokens(plan), ["12", "×"]);
  assert.equal(planOutcomeLabel(plan), "1/2 done · 1 skipped");
  assert.equal(plan.plannedSlots[1].synthetic, true);
});

test("planned slots show completed, skipped, and open outcomes in order", () => {
  const plan = projectSetPlan(
    [
      { isPlanned: true, position: 0, reps: 10, status: "completed" },
      { isPlanned: true, position: 1, reps: null, status: "skipped" },
      { isPlanned: true, position: 2, reps: null, status: "planned" },
    ],
    3,
  );

  assert.deepEqual(planTokens(plan), ["10", "×", "—"]);
  assert.equal(planOutcomeLabel(plan), "1/3 done · 1 skipped · 1 open");
});

test("extra sets are counted separately from the planned target", () => {
  const plan = projectSetPlan(
    [
      { isPlanned: true, position: 0, reps: 8, status: "completed" },
      { isPlanned: true, position: 1, reps: 8, status: "completed" },
      { isPlanned: false, position: 2, reps: 7, status: "completed" },
    ],
    2,
  );

  assert.deepEqual(planTokens(plan), ["8", "8"]);
  assert.equal(planOutcomeLabel(plan), "2/2 done · +1 extra");
});

test("set removal uses planned and extra language", () => {
  assert.equal(removalActionLabel({ isPlanned: true }), "Skip planned set");
  assert.equal(removalActionLabel({ isPlanned: false }), "Remove extra set");
});

test("a completed set plus a removed planned set completes the exercise", () => {
  assert.equal(
    exerciseStatusAfterSetChange(["completed", "skipped"]),
    "completed",
  );
  assert.equal(
    exerciseStatusAfterSetChange(["completed", "planned"]),
    "planned",
  );
});
