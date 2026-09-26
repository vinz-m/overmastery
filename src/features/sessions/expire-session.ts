import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "../../lib/supabase/database.types.ts";
import { pendingSyncCookie } from "./pending-sync-cookie.ts";
import { isSessionExpired, lastActivityAt } from "./session-day.ts";

export type ExpiredSession = {
  id: string;
  outcome: ClosedOutcome;
};

type ClosedOutcome = "completed" | "removed";

/** Closes the user's active session if it has gone idle. */
export async function expireStaleSession(
  supabase: SupabaseClient<Database>,
  userId: string,
  now = new Date(),
): Promise<ExpiredSession | null> {
  const { data: session, error } = await supabase
    .from("training_sessions")
    .select(
      "id, started_at, session_exercises ( exercise_sets ( completed_at ) )",
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (error)
    throw new Error("Your current workout couldn’t be checked. Try again.");
  if (!session) return null;
  // This device still holds sets for it that the server hasn't seen, so its
  // last activity is unknown here. Let them sync first.
  const cookieStore = await cookies();
  if (cookieStore.get(pendingSyncCookie)?.value === session.id) return null;

  const completedAts = session.session_exercises.flatMap((exercise) =>
    exercise.exercise_sets.map((set) => set.completed_at),
  );
  if (!isSessionExpired(lastActivityAt(session.started_at, completedAts), now))
    return null;

  const outcome = await closeExpiredSession(
    supabase,
    session.id,
    lastSetAt(completedAts),
  );
  return { id: session.id, outcome };
}

/** The latest completion time among a session's sets, or null if none were logged. */
export function lastSetAt(completedAts: readonly (string | null)[]) {
  const times = completedAts.filter((time): time is string => time !== null);
  if (times.length === 0) return null;
  return lastActivityAt(times[0], times);
}

/**
 * A workout left open after its last set was almost always finished and not
 * tapped as such, so it is completed, ending at its last logged set rather
 * than when it was noticed. One with nothing logged is removed, as a discard
 * would. Only acts on a session that is still active, so it can't overwrite
 * one finished by another request.
 */
export async function closeExpiredSession(
  supabase: SupabaseClient<Database>,
  sessionId: string,
  lastSet: string | null,
): Promise<ClosedOutcome> {
  if (lastSet === null) {
    const { error } = await supabase
      .from("training_sessions")
      .delete()
      .eq("id", sessionId)
      .eq("status", "active");
    if (error)
      throw new Error("Your last workout couldn’t be closed. Try again.");
    return "removed";
  }

  // finish_session settles sets and exercises in one transaction; it stamps
  // the end as now, so move it back to the last set afterwards.
  const { data: outcome, error } = await supabase.rpc("finish_session", {
    p_session_id: sessionId,
  });
  if (error)
    throw new Error("Your last workout couldn’t be closed. Try again.");
  if (outcome === "finished")
    await supabase
      .from("training_sessions")
      .update({ ended_at: lastSet })
      .eq("id", sessionId)
      .eq("status", "completed");
  return "completed";
}
