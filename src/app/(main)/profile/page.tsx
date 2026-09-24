import { ProfileSettings } from "@/features/profile/profile-settings";
import { timeZoneOptions } from "@/features/profile/time-zones";
import { requireUser } from "@/lib/auth/session";
import { PageTransition } from "@/features/navigation/page-transition";

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <PageTransition>
      <ProfileSettings
        createdAt={user.createdAt}
        displayName={user.displayName ?? "You"}
        email={user.email ?? "Signed-in account"}
        guidance={user.guidance}
        timeZone={user.timeZone}
        timeZoneOptions={timeZoneOptions(user.timeZone)}
        unitSystem={user.unitSystem}
      />
    </PageTransition>
  );
}
