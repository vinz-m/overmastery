import assert from "node:assert/strict";
import test from "node:test";
import { expirePreviousDaySession } from "./expire-session.ts";
import { nextSessionDay } from "./session-day.ts";

function database(startedAt: string, status = "active") {
  const row = { id: "session", user_id: "owner", started_at: startedAt, status, ended_at: null as string | null };
  const sets = [{ reps: 8, weight_kg: 50, status: "completed" }];
  const writes: Record<string, unknown>[] = [];
  let filters: Record<string, unknown> = {};
  const client = {
    from(table: string) {
      assert.equal(table, "training_sessions", "expiry must not rewrite logged sets");
      filters = {};
      let update: Record<string, unknown> | undefined;
      const query = {
        select() { return query; },
        eq(key: string, value: unknown) { filters[key] = value; return query; },
        update(value: Record<string, unknown>) { update = value; return query; },
        async maybeSingle() {
          return { data: Object.entries(filters).every(([key, value]) => row[key as keyof typeof row] === value) ? { ...row } : null, error: null };
        },
        then(resolve: (result: { error: null }) => void) {
          assert.equal(filters.user_id, "owner");
          assert.equal(filters.status, "active", "do not overwrite a concurrently finished session");
          if (update && Object.entries(filters).every(([key, value]) => row[key as keyof typeof row] === value)) {
            writes.push(update);
            Object.assign(row, update);
          }
          resolve({ error: null });
        },
      };
      return query;
    },
  };
  return { client: client as unknown as Parameters<typeof expirePreviousDaySession>[0], row, sets, writes };
}

test("yesterday's session is closed at local midnight and its recorded sets are retained", async () => {
  const db = database("2026-09-04T15:50:00Z"); // 23:50 in Manila
  await expirePreviousDaySession(db.client, "owner", "Asia/Manila", new Date("2026-09-04T16:01:00Z"));
  assert.equal(db.row.status, "abandoned");
  assert.equal(db.row.ended_at, "2026-09-04T16:00:00.000Z");
  assert.deepEqual(db.sets, [{ reps: 8, weight_kg: 50, status: "completed" }]);
});

test("a session stays active throughout its local day even across UTC midnight", async () => {
  const db = database("2026-09-04T18:00:00Z");
  await expirePreviousDaySession(db.client, "owner", "Asia/Manila", new Date("2026-09-05T01:00:00Z"));
  assert.equal(db.row.status, "active");
  assert.equal(db.writes.length, 0);
});

test("expiry is idempotent and leaves completed sessions alone", async () => {
  for (const status of ["active", "completed"]) {
    const db = database("2026-09-01T10:00:00Z", status);
    await expirePreviousDaySession(db.client, "owner", "UTC", new Date("2026-09-05T10:00:00Z"));
    await expirePreviousDaySession(db.client, "owner", "UTC", new Date("2026-09-05T11:00:00Z"));
    assert.equal(db.writes.length, status === "active" ? 1 : 0);
    assert.equal(db.row.status, status === "active" ? "abandoned" : "completed");
  }
});

test("day boundaries account for DST and year rollover", () => {
  assert.equal(nextSessionDay("2026-03-08T05:00:00Z", "America/New_York"), "2026-03-09T04:00:00.000Z");
  assert.equal(nextSessionDay("2026-11-01T04:00:00Z", "America/New_York"), "2026-11-02T05:00:00.000Z");
  assert.equal(nextSessionDay("2026-12-31T23:59:59Z", "UTC"), "2027-01-01T00:00:00.000Z");
});
