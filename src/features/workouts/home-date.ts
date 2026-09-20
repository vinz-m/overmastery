type DateInput = Date | number | string;

const locale = "en-US";

export function formatHomeDate(value: DateInput, timeZone: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    timeZone,
    weekday: "long",
  }).format(new Date(value));
}

export function formatHomeTime(value: DateInput, timeZone: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(value));
}

export function formatMonthDay(value: DateInput, timeZone: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone,
  }).format(new Date(value));
}

export function greetingFor(value: DateInput, timeZone: string) {
  const hourPart = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    hourCycle: "h23",
    timeZone,
  })
    .formatToParts(new Date(value))
    .find((part) => part.type === "hour");
  const hour = Number(hourPart?.value);

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
