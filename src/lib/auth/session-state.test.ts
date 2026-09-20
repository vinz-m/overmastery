import assert from "node:assert/strict";
import test from "node:test";

import { hasVerifiedUser } from "./session-state.ts";

test("a verified user may be redirected away from the login page", () => {
  assert.equal(
    hasVerifiedUser({
      data: { user: { id: "user-123" } },
      error: null,
    }),
    true,
  );
});

test("a stale session is not treated as authenticated", () => {
  assert.equal(
    hasVerifiedUser({
      data: { user: null },
      error: new Error("The session is no longer valid."),
    }),
    false,
  );
});
