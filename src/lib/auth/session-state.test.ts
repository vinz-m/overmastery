import assert from "node:assert/strict";
import test from "node:test";

import { hasVerifiedClaims } from "./session-state.ts";

test("a verified user may be redirected away from the login page", () => {
  assert.equal(
    hasVerifiedClaims({
      data: { claims: { sub: "user-123" } },
      error: null,
    }),
    true,
  );
});

test("a stale session is not treated as authenticated", () => {
  assert.equal(
    hasVerifiedClaims({
      data: { claims: null },
      error: new Error("The session is no longer valid."),
    }),
    false,
  );
});
