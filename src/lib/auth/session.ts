import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { readGuidanceState } from "@/features/guidance/model";
import { hasVerifiedClaims } from "@/lib/auth/session-state";
import { createClient } from "@/lib/supabase/server";
import { nextSessionDay } from "@/features/sessions/session-day";

const loadRequiredUser = async () => {
  const supabase = await createClient();
  const result = await supabase.auth.getClaims();

  if (!hasVerifiedClaims(result)) {
    redirect("/login");
  }

  const claims = result.data.claims;
  const subject = claims.sub;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("created_at, display_name, time_zone, unit_system")
    .eq("id", subject)
    .single();

  if (profileError || !profile) {
    throw new Error("Your profile settings could not be loaded.");
  }

  const now = new Date();

  return {
    dayEndsAt: nextSessionDay(now.toISOString(), profile.time_zone),
    id: subject,
    createdAt: profile.created_at,
    displayName: profile.display_name ?? undefined,
    email: typeof claims.email === "string" ? claims.email : undefined,
    guidance: readGuidanceState(claims.user_metadata),
    timeZone: profile.time_zone,
    unitSystem: profile.unit_system,
  };
};

export const requireUser = cache(loadRequiredUser);

export async function redirectAuthenticatedUser() {
  const supabase = await createClient();
  const result = await supabase.auth.getClaims();

  if (hasVerifiedClaims(result)) {
    redirect("/");
  }
}
