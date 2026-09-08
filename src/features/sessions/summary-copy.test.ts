import assert from "node:assert/strict";
import test from "node:test";

import { sessionSummaryLead } from "./summary-copy.ts";

test("a first session reports recorded exercise baselines", () => {
  assert.deepEqual(sessionSummaryLead({ baselines: 6, improved: 0 }), {
    headline: "Baseline recorded. Now you have something to beat.",
    label: "exercise baselines recorded",
    metric: 6,
  });
});

test("a later session reports exercises improved since last time", () => {
  assert.deepEqual(sessionSummaryLead({ baselines: 0, improved: 1 }), {
    headline: "The work showed up in the numbers.",
    label: "exercise improved since last time",
    metric: 1,
  });
});
