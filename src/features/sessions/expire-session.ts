import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../lib/supabase/database.types.ts";
import { nextSessionDay } from "./session-day.ts";

export async function expirePreviousDaySession(
  supabase: SupabaseClient<Database>,
  userId: string,
  timeZone: string,
  now = new Date(),
) {
  const { data: session, error } = await supabase
    .from("training_sessions")
    .select("id, started_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new Error("Your active session could not be checked.");
  if (!session) return;

  const endedAt = nextSessionDay(session.started_at, timeZone);
  if (now.getTime() < new Date(endedAt).getTime()) return;

  // Only close the session, never fabricate completion or alter recorded sets.
  // Conditional update also protects a session finished by another request.
  const { error: updateError } = await supabase
    .from("training_sessions")
    .update({ status: "abandoned", ended_at: endedAt })
    .eq("id", session.id)
    .eq("user_id", userId)
    .eq("status", "active");
  if (updateError) throw new Error("Your previous session could not be closed. Try again.");
}
