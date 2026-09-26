export function formatSessionDate(value: string, long = false) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: long ? "long" : "short",
    year: long ? "numeric" : undefined,
  }).format(new Date(value));
}

export function formatDuration(startedAt: string, endedAt: string) {
  const minutes = Math.max(
    1,
    Math.round(
      (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000,
    ),
  );
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}

export function planLabel(
  completed: number,
  planned: number,
  skipped: number,
  extras: number,
) {
  if (planned === 0) return `${extras} ${extras === 1 ? "set" : "sets"} done`;
  const skippedCopy = skipped ? ` · ${skipped} skipped` : "";
  const extraCopy = extras ? ` · +${extras} extra` : "";
  return `${completed} of ${planned} sets done${skippedCopy}${extraCopy}`;
}

/** "1st time", "2nd time", "11th time": which time an exercise was done. */
export function timeLabel(count: number) {
  const lastTwo = count % 100;
  const suffix =
    lastTwo >= 11 && lastTwo <= 13
      ? "th"
      : ({ 1: "st", 2: "nd", 3: "rd" }[count % 10] ?? "th");
  return `${count}${suffix} time`;
}

/** "1 set", "3 sets". */
export function countLabel(count: number, noun: string) {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

/** "September 2026", for grouping lists by month. */
export function formatMonth(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}
