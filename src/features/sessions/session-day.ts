/** The first instant of the next calendar day in the user's time zone. */
export function nextSessionDay(startedAt: string, timeZone: string): string {
  const start = new Date(startedAt).getTime();
  if (!Number.isFinite(start)) throw new Error("Invalid session start time.");
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const day = formatter.format(start);
  let low = start;
  // Covers 25-hour DST days as well as changes to a zone's UTC offset.
  let high = start + 48 * 60 * 60 * 1000;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (formatter.format(middle) === day) low = middle;
    else high = middle;
  }
  return new Date(high).toISOString();
}

/**
 * A workout with no set logged for this long is closed automatically. Measured
 * from the last logged set, not the start, so a long session is never cut off
 * while a workout left open after its last set closes within hours. Long
 * enough for any real rest or break between exercises.
 */
export const sessionIdleLimitMs = 4 * 60 * 60 * 1000;

/** When the session last saw activity: its latest logged set, or its start. */
export function lastActivityAt(
  startedAt: string,
  completedAts: readonly (string | null)[],
): string {
  let latest = new Date(startedAt).getTime();
  if (!Number.isFinite(latest)) throw new Error("Invalid session start time.");
  for (const completedAt of completedAts) {
    const time = completedAt ? new Date(completedAt).getTime() : NaN;
    if (time > latest) latest = time;
  }
  return new Date(latest).toISOString();
}

export function sessionExpiresAt(lastActivity: string): string {
  const last = new Date(lastActivity).getTime();
  if (!Number.isFinite(last)) throw new Error("Invalid session activity time.");
  return new Date(last + sessionIdleLimitMs).toISOString();
}

export function isSessionExpired(lastActivity: string, now = new Date()) {
  return now.getTime() >= new Date(sessionExpiresAt(lastActivity)).getTime();
}
