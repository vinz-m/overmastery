import { ProfileSettings } from "@/features/profile/profile-settings";
import { requireUser } from "@/lib/auth/session";
import { PageTransition } from "@/features/navigation/page-transition";

export default async function ProfilePage() {
  const user = await requireUser();
  const timeZones = Intl.supportedValuesOf("timeZone");
  if (!timeZones.includes(user.timeZone)) timeZones.unshift(user.timeZone);

  return (
    <PageTransition>
      <ProfileSettings
        createdAt={user.createdAt}
        displayName={user.displayName ?? "You"}
        email={user.email ?? "Signed-in account"}
        guidance={user.guidance}
        timeZone={user.timeZone}
        timeZones={timeZones}
        unitSystem={user.unitSystem}
      />
    </PageTransition>
  );
}
