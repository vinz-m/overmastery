import type { SelectOption } from "@/features/ui/select-field";

/**
 * Every IANA zone as a readable, searchable option, ordered by UTC offset
 * (west to east) and then by city: "Asia/Manila" -> "GMT+8 · Manila · Asia".
 * Offsets reflect today's date, so zones with daylight saving sort by their
 * current offset. The raw id stays searchable.
 */
export function timeZoneOptions(current: string, now = new Date()): SelectOption[] {
  const zones = new Set(Intl.supportedValuesOf("timeZone"));
  zones.add("UTC");
  zones.add(current);

  return [...zones]
    .map((zone) => {
      const offset = offsetName(zone, now);
      return {
        keywords: zone,
        label: timeZoneLabel(zone, offset),
        minutes: offsetMinutes(offset),
        place: placeName(zone),
        value: zone,
      };
    })
    .sort((left, right) => left.minutes - right.minutes || left.place.localeCompare(right.place))
    .map(({ keywords, label, value }) => ({ keywords, label, value }));
}

function timeZoneLabel(zone: string, offset: string) {
  if (zone === "UTC") return "GMT · UTC · Coordinated Universal Time";
  const region = zone.split("/").slice(0, -1).join(" / ").replaceAll("_", " ");
  return [offset, placeName(zone), region].filter(Boolean).join(" · ");
}

function placeName(zone: string) {
  const parts = zone.split("/");
  return parts[parts.length - 1].replaceAll("_", " ");
}

/** "GMT+5:30" -> 330, "GMT-3" -> -180, "GMT" -> 0. */
function offsetMinutes(offset: string) {
  const match = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(offset);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
  return match[1] === "-" ? -minutes : minutes;
}

function offsetName(zone: string, now: Date) {
  try {
    return (
      new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" })
        .formatToParts(now)
        .find((part) => part.type === "timeZoneName")?.value ?? "GMT"
    );
  } catch {
    return "GMT";
  }
}
