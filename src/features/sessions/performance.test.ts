import assert from "node:assert/strict";
import test from "node:test";

import { comparePerformance } from "./performance.ts";
import { toDisplayLoad, toKilograms } from "../../lib/units.ts";

test("higher load with no lost reps is improved", () => {
  assert.deepEqual(
    comparePerformance(
      { loadKg: 102.5, reps: [5, 5, 5] },
      { loadKg: 100, reps: [5, 5, 5] },
      "weight_reps",
    ),
    { label: "+2.5 kg", state: "improved" },
  );
});

test("a load increase with fewer reps is not forced into a verdict", () => {
  assert.deepEqual(
    comparePerformance(
      { loadKg: 102.5, reps: [5, 4, 4] },
      { loadKg: 100, reps: [5, 5, 5] },
      "weight_reps",
    ),
    { label: "Different set structure", state: "notComparable" },
  );
});

test("same load and ordered reps is matched", () => {
  assert.deepEqual(
    comparePerformance(
      { loadKg: 100, reps: [5, 5, 5] },
      { loadKg: 100, reps: [5, 5, 5] },
      "weight_reps",
    ),
    { label: "Matched previous", state: "matched" },
  );
});

test("pound entry round-trips through canonical kilograms", () => {
  const kilograms = toKilograms(220, "imperial");
  assert.equal(toDisplayLoad(kilograms, "imperial"), 220);
});

test("load comparison labels respect the display unit", () => {
  assert.deepEqual(
    comparePerformance(
      { loadKg: 102.5, reps: [5, 5, 5] },
      { loadKg: 100, reps: [5, 5, 5] },
      "weight_reps",
      "imperial",
    ),
    { label: "+5.51 lb", state: "improved" },
  );
});
