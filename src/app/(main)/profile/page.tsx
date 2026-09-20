import { ProfileSettings } from "@/features/profile/profile-settings";
import { requireUser } from "@/lib/auth/session";

export default async function ProfilePage() {
  const user = await requireUser();
  const timeZones = Intl.supportedValuesOf("timeZone");
  if (!timeZones.includes(user.timeZone)) timeZones.unshift(user.timeZone);

  return (
    <ProfileSettings
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
