"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { pendingSyncCookie } from "./pending-sync-cookie";
import type {
  ActiveSession,
  CompleteSetInput,
  SessionMutationResult,
} from "./types";

/**
 * Gyms often have poor reception. Every logged set is kept on the device and
 * shown as done straight away, then sent in the background, so a slow or
 * hanging request never holds up the workout. Only completing a set is queued:
 * it's the one action done every minute mid-workout, and it's safe to replay.
 */
export type QueuedSet = CompleteSetInput & {
  queuedAt: number;
  /** Saved on the server; kept only until the refreshed session shows it. */
  synced?: boolean;
};

type Pending = Record<string, QueuedSet>;

const retryIntervalMs = 20_000;
// A request on a weak signal can hang for minutes instead of failing. Past
// this, give up on it and retry later; replaying a set is harmless.
const sendTimeoutMs = 15_000;
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

// A plain fetch, not a server action: Next runs server actions one at a time,
// so a hung request would block every retry behind it, and it can't be aborted.
async function send(item: QueuedSet): Promise<SessionMutationResult> {
  const response = await fetch("/api/sessions/sets/complete", {
    body: JSON.stringify({
      completedAt: new Date(item.queuedAt).toISOString(),
      loadKg: item.loadKg,
      loadUnit: item.loadUnit,
      reps: item.reps,
      sessionId: item.sessionId,
      setId: item.setId,
    } satisfies CompleteSetInput),
    headers: { "Content-Type": "application/json" },
    method: "POST",
    signal: AbortSignal.timeout(sendTimeoutMs),
  });
  // Anything but a JSON answer (a gateway error, a sign-in redirect) is
  // treated like no connection: keep the set and try again later.
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new Error("The set could not be sent.");
  return (await response.json()) as SessionMutationResult;
}

export function useOfflineSetQueue(
  serverSession: ActiveSession,
  onRejected: (message: string) => void,
) {
  const sessionId = serverSession.id;
  const router = useRouter();
  const [pending, setPending] = useState<Pending>({});
  // A send has failed or timed out, so sets are waiting on the connection
  // rather than just in flight.
  const [stalled, setStalled] = useState(false);
  const pendingRef = useRef<Pending>({});
  const flushing = useRef(false);

  const update = useCallback(
    (next: Pending) => {
      pendingRef.current = next;
      setPending(next);
      // Synced sets only bridge the wait for the refresh, so they live in memory.
      const unsynced = Object.fromEntries(
        Object.entries(next).filter(([, item]) => !item.synced),
      );
      writeStored(sessionId, unsynced);
      if (Object.keys(unsynced).length === 0) setStalled(false);
    },
    [sessionId],
  );

  const flush = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    let savedAny = false;
    try {
      // Oldest first, and keep going so sets logged mid-flush aren't left for
      // the next retry.
      for (;;) {
        const [item] = Object.values(pendingRef.current)
          .filter((queued) => !queued.synced)
          .sort((left, right) => left.queuedAt - right.queuedAt);
        if (!item) return;
        let result;
        try {
          result = await send(item);
        } catch {
          setStalled(true);
          return; // Keep everything and try again later.
        }
        const { [item.setId]: current, ...rest } = pendingRef.current;
        if (!result.ok) {
          if (current === item) update(rest);
          // The server refused it (e.g. the workout was closed); say so rather than drop it silently.
          onRejected(
            result.message ?? "A set saved offline couldn't be synced.",
          );
          continue;
        }
        savedAny = true;
        // It may have been re-logged with new values while the request was in
        // flight; then the new values still need sending.
        if (current === item)
          update({ ...rest, [item.setId]: { ...item, synced: true } });
      }
    } finally {
      flushing.current = false;
      // Wait until nothing is left to send: syncing can complete a workout
      // that went idle, and the refresh then leaves this screen for its summary.
      const drained = Object.values(pendingRef.current).every(
        (queued) => queued.synced,
      );
      if (savedAny && drained) router.refresh();
    }
  }, [onRejected, router, update]);

  // Restore anything left from a previous visit.
  useEffect(() => {
    const stored = readStored(sessionId);
    pendingRef.current = stored;
    setPending(stored);
  }, [sessionId]);

  // Drop synced sets once the server's copy of the session shows them.
  useEffect(() => {
    const completed = new Set(
      serverSession.exercises.flatMap((exercise) =>
        exercise.sets
          .filter((set) => set.status === "completed")
          .map((set) => set.id),
      ),
    );
    const current = pendingRef.current;
    const next = Object.fromEntries(
      Object.entries(current).filter(
        ([setId, item]) => !(item.synced && completed.has(setId)),
      ),
    );
    if (Object.keys(next).length !== Object.keys(current).length) update(next);
  }, [serverSession, update]);

  const waiting = Object.values(pending).filter((item) => !item.synced).length;
  useEffect(() => {
    document.cookie =
      waiting > 0
        ? `${pendingSyncCookie}=${sessionId}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`
        : `${pendingSyncCookie}=; path=/; max-age=0; samesite=lax`;
  }, [sessionId, waiting]);
  useEffect(() => {
    if (waiting === 0) return;
    const retry = () => void flush();
    retry();
    window.addEventListener("online", retry);
    const timer = window.setInterval(retry, retryIntervalMs);
    return () => {
      window.removeEventListener("online", retry);
      window.clearInterval(timer);
    };
  }, [flush, waiting]);

  const enqueue = useCallback(
    (item: CompleteSetInput) => {
      update({
        ...pendingRef.current,
        [item.setId]: { ...item, queuedAt: Date.now() },
      });
      void flush();
    },
    [flush, update],
  );

  const discard = useCallback(
    (setId: string) => {
      const { [setId]: _removed, ...rest } = pendingRef.current;
      void _removed;
      update(rest);
    },
    [update],
  );

  return { discard, enqueue, pending, stalled, waiting };
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
