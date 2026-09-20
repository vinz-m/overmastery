import { ProfileSettings } from "@/features/profile/profile-settings";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: activeSession, error } = await supabase
    .from("training_sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new Error("Your profile could not be loaded.");

  const timeZones = Intl.supportedValuesOf("timeZone");
  if (!timeZones.includes(user.timeZone)) timeZones.unshift(user.timeZone);

  return (
    <ProfileSettings
      dayEndsAt={user.dayEndsAt}
      activeSessionId={activeSession?.id}
      createdAt={user.createdAt}
      displayName={user.displayName ?? "You"}
      email={user.email ?? "Signed-in account"}
      guidance={user.guidance}
      timeZone={user.timeZone}
      timeZones={timeZones}
      unitSystem={user.unitSystem}
    />
  );
}
