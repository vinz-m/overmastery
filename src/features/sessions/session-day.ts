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
