import assert from "node:assert/strict";
import test from "node:test";

import {
  formatHomeDate,
  formatHomeTime,
  formatMonthDay,
  greetingFor,
} from "./home-date.ts";

const nearManilaMidnight = new Date("2026-09-19T16:05:00.000Z");

test("home date uses the user's calendar day", () => {
  assert.equal(
    formatHomeDate(nearManilaMidnight, "Asia/Manila"),
    "Sunday, September 20",
  );
  assert.equal(
    formatHomeDate(nearManilaMidnight, "America/Los_Angeles"),
    "Saturday, September 19",
  );
});

test("greeting uses the user's local hour", () => {
  assert.equal(greetingFor(nearManilaMidnight, "Asia/Manila"), "Good morning");
  assert.equal(
    greetingFor(nearManilaMidnight, "America/Los_Angeles"),
    "Good morning",
  );
  assert.equal(greetingFor(nearManilaMidnight, "Europe/London"), "Good afternoon");
});

test("session and history timestamps use the user's time zone", () => {
  assert.equal(
    formatHomeTime(nearManilaMidnight, "Asia/Manila"),
    "12:05 AM",
  );
  assert.equal(
    formatMonthDay(nearManilaMidnight, "Asia/Manila"),
    "Sep 20",
  );
});
