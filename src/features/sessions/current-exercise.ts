"use client";

import { useSyncExternalStore } from "react";

import { currentExerciseCookie } from "./current-exercise-cookie";

/**
 * Remembers which exercise is on screen. Kept in a cookie rather than
 * localStorage so the server renders the exercise the phone remembers, with
 * no slide on load. The page can also come from the router cache (up to 30s
 * old) where the server's copy is stale, so the client reads the cookie too.
 */
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readCookie() {
  const entry = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${currentExerciseCookie}=`));
  return entry ? entry.slice(currentExerciseCookie.length + 1) : null;
}

export function useCurrentExercise(serverExerciseId: string | null) {
  const exerciseId = useSyncExternalStore(
    subscribe,
    readCookie,
    () => serverExerciseId,
  );
  const setExerciseId = (next: string) => {
    document.cookie = `${currentExerciseCookie}=${next}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`;
    for (const listener of listeners) listener();
  };
  return [exerciseId, setExerciseId] as const;
}
