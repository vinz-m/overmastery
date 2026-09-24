"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Refresh once at midnight, or when a sleeping tab returns after midnight. */
export function SessionDayRefresh({ dayEndsAt }: { dayEndsAt: string }) {
  const router = useRouter();
  useEffect(() => {
    const deadline = new Date(dayEndsAt).getTime();
    let refreshed = false;
    const refreshIfNeeded = () => {
      if (!refreshed && Date.now() >= deadline) {
        refreshed = true;
        router.refresh();
      }
    };
    const timer = window.setTimeout(
      refreshIfNeeded,
      Math.max(0, deadline - Date.now()) + 50,
    );
    document.addEventListener("visibilitychange", refreshIfNeeded);
    window.addEventListener("focus", refreshIfNeeded);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", refreshIfNeeded);
      window.removeEventListener("focus", refreshIfNeeded);
    };
  }, [dayEndsAt, router]);
  return null;
}
