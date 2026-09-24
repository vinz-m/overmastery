"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import type { UnitSystem } from "@/lib/units";

import { completeSet } from "./actions";
import type { ActiveSession } from "./types";

/**
 * Gyms often have poor reception. A set logged while the request can't reach
 * the server is kept on the device, shown as done, and sent once the
 * connection is back. Only completing a set is queued: it's the one action
 * done every minute mid-workout, and it's safe to replay.
 */
export type QueuedSet = {
  loadKg: number | null;
  loadUnit: UnitSystem | null;
  queuedAt: number;
  reps: number;
  sessionId: string;
  setId: string;
};

type Pending = Record<string, QueuedSet>;

const retryIntervalMs = 20_000;
const storageKey = (sessionId: string) =>
  `overmastery-pending-sets:${sessionId}`;

function readStored(sessionId: string): Pending {
  try {
    const raw = localStorage.getItem(storageKey(sessionId));
    return raw ? (JSON.parse(raw) as Pending) : {};
  } catch {
    return {};
  }
}

function writeStored(sessionId: string, pending: Pending) {
  try {
    if (Object.keys(pending).length === 0)
      localStorage.removeItem(storageKey(sessionId));
    else localStorage.setItem(storageKey(sessionId), JSON.stringify(pending));
  } catch {
    // Storage full or blocked: the queue still lives in memory for this visit.
  }
}

export function useOfflineSetQueue(
  sessionId: string,
  onRejected: (message: string) => void,
) {
  const [pending, setPending] = useState<Pending>({});
  const [, startTransition] = useTransition();
  const pendingRef = useRef<Pending>({});
  const flushing = useRef(false);

  const update = useCallback(
    (next: Pending) => {
      pendingRef.current = next;
      setPending(next);
      writeStored(sessionId, next);
    },
    [sessionId],
  );

  const flush = useCallback(async () => {
    if (flushing.current || Object.keys(pendingRef.current).length === 0)
      return;
    flushing.current = true;
    try {
      const queue = Object.values(pendingRef.current).sort(
        (left, right) => left.queuedAt - right.queuedAt,
      );
      for (const item of queue) {
        let result;
        try {
          result = await completeSet({
            loadKg: item.loadKg,
            loadUnit: item.loadUnit,
            reps: item.reps,
            sessionId: item.sessionId,
            setId: item.setId,
          });
        } catch {
          return; // Still offline: keep everything and try again later.
        }
        const { [item.setId]: _sent, ...rest } = pendingRef.current;
        void _sent;
        update(rest);
        // The server refused it (e.g. the workout was closed); say so rather than drop it silently.
        if (!result.ok)
          onRejected(
            result.message ?? "A set saved offline couldn't be synced.",
          );
      }
    } finally {
      flushing.current = false;
    }
  }, [onRejected, update]);

  // Restore anything left from a previous visit, then keep retrying while sets wait.
  useEffect(() => {
    const stored = readStored(sessionId);
    pendingRef.current = stored;
    setPending(stored);
  }, [sessionId]);

  const hasPending = Object.keys(pending).length > 0;
  useEffect(() => {
    if (!hasPending) return;
    const retry = () => startTransition(() => flush());
    retry();
    window.addEventListener("online", retry);
    const timer = window.setInterval(retry, retryIntervalMs);
    return () => {
      window.removeEventListener("online", retry);
      window.clearInterval(timer);
    };
  }, [flush, hasPending]);

  const enqueue = useCallback(
    (item: Omit<QueuedSet, "queuedAt">) => {
      update({
        ...pendingRef.current,
        [item.setId]: { ...item, queuedAt: Date.now() },
      });
    },
    [update],
  );

  const discard = useCallback(
    (setId: string) => {
      const { [setId]: _removed, ...rest } = pendingRef.current;
      void _removed;
      update(rest);
    },
    [update],
  );

  return { discard, enqueue, pending };
}

/** Shows queued sets as completed so the workout carries on while offline. */
export function applyPendingSets(
  session: ActiveSession,
  pending: Record<string, QueuedSet>,
): ActiveSession {
  if (Object.keys(pending).length === 0) return session;
  return {
    ...session,
    exercises: session.exercises.map((exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set) => {
        const queued = pending[set.id];
        return queued && set.status !== "completed"
          ? {
              ...set,
              enteredUnit: queued.loadUnit,
              loadKg: queued.loadKg,
              reps: queued.reps,
              status: "completed" as const,
            }
          : set;
      }),
    })),
  };
}
