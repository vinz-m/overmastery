"use client";

import { useEffect, useTransition } from "react";

import { adoptDeviceTimeZone } from "./actions";

// Set when the user deliberately chose UTC, so this device stops asking.
const keptUtcKey = "overmastery-time-zone-kept";

/** Rendered only while the profile still has the "UTC" signup default. */
export function DeviceTimeZoneSync() {
  const [, startTransition] = useTransition();

  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!timeZone || timeZone === "UTC") return;
    try {
      if (localStorage.getItem(keptUtcKey)) return;
    } catch {
      // Storage can be unavailable; the server check still protects the choice.
    }
    startTransition(async () => {
      const adopted = await adoptDeviceTimeZone(timeZone);
      if (adopted) return;
      try {
        localStorage.setItem(keptUtcKey, "1");
      } catch {
        // Ignore: the server keeps declining, it just asks again next visit.
      }
    });
  }, []);

  return null;
}
