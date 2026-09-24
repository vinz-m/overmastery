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
