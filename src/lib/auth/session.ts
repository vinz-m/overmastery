import "server-only";

import { redirect } from "next/navigation";

import { readGuidanceState } from "@/features/guidance/model";
import { hasVerifiedUser } from "@/lib/auth/session-state";
import { createClient } from "@/lib/supabase/server";
import { expirePreviousDaySession } from "@/features/sessions/expire-session";
import { nextSessionDay } from "@/features/sessions/session-day";

export async function requireUser() {
  const supabase = await createClient();
  const result = await supabase.auth.getUser();

  if (!hasVerifiedUser(result)) {
    redirect("/login");
  }

  const subject = result.data.user.id;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("created_at, display_name, time_zone, unit_system")
    .eq("id", subject)
    .single();

  if (profileError || !profile) {
    throw new Error("Your profile settings could not be loaded.");
  }

  // Every authenticated page and session mutation passes this boundary. Closing
  // stale sessions here also frees the one-active-session constraint before start.
  const now = new Date();
  await expirePreviousDaySession(supabase, subject, profile.time_zone, now);

  return {
    dayEndsAt: nextSessionDay(now.toISOString(), profile.time_zone),
    id: subject,
    createdAt: profile.created_at,
    displayName: profile.display_name ?? undefined,
    email: result.data.user.email,
    guidance: readGuidanceState(result.data.user.user_metadata),
    timeZone: profile.time_zone,
    unitSystem: profile.unit_system,
  };
}

export async function redirectAuthenticatedUser() {
  const supabase = await createClient();
  const result = await supabase.auth.getUser();

  if (hasVerifiedUser(result)) {
    redirect("/");
  }
}
