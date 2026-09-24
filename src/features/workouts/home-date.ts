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

export type TrainingWeekDay = {
  isFuture: boolean;
  isToday: boolean;
  key: string;
  label: string;
  trained: boolean;
};

const weekdayLabels = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * Monday-to-Sunday view of the user's current week in their time zone, plus
 * workout counts for this week and last week.
 */
export function trainingWeek(
  trainedAt: readonly string[],
  now: DateInput,
  timeZone: string,
) {
  const today = localDate(now, timeZone);
  // 0 = Monday … 6 = Sunday.
  const weekdayIndex = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
  const monday = addDays(today, -weekdayIndex);
  const previousMonday = addDays(monday, -7);
  const nextMonday = addDays(monday, 7);

  const trainedDays = new Set<string>();
  let thisWeek = 0;
  let lastWeek = 0;
  for (const value of trainedAt) {
    const day = localDate(value, timeZone);
    if (day >= monday && day < nextMonday) {
      thisWeek += 1;
      trainedDays.add(day);
    } else if (day >= previousMonday && day < monday) {
      lastWeek += 1;
    }
  }

  const days: TrainingWeekDay[] = weekdayLabels.map((label, index) => {
    const key = addDays(monday, index);
    return { isFuture: key > today, isToday: key === today, key, label, trained: trainedDays.has(key) };
  });

  return { days, lastWeek, thisWeek };
}

/** Calendar date (YYYY-MM-DD) of an instant in a time zone. */
function localDate(value: DateInput, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).format(new Date(value));
}

function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}
