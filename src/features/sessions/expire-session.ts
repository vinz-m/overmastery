import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../lib/supabase/database.types.ts";
import { isSessionExpired, sessionExpiresAt } from "./session-day.ts";

/** Closes the user's active session if it has been open past its lifetime. */
export async function expireStaleSession(
  supabase: SupabaseClient<Database>,
  userId: string,
  now = new Date(),
) {
  const { data: session, error } = await supabase
    .from("training_sessions")
    .select("id, started_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new Error("Your active session could not be checked.");
  if (!session || !isSessionExpired(session.started_at, now)) return;

  await closeExpiredSession(supabase, session.id, session.started_at);
}

/**
 * Only closes the session, never fabricates completion or alters recorded sets.
 * The conditional update also protects a session finished by another request.
 */
export async function closeExpiredSession(
  supabase: SupabaseClient<Database>,
  sessionId: string,
  startedAt: string,
) {
  const { error } = await supabase
    .from("training_sessions")
    .update({ status: "abandoned", ended_at: sessionExpiresAt(startedAt) })
    .eq("id", sessionId)
    .eq("status", "active");
  if (error) throw new Error("Your previous session could not be closed. Try again.");
}
