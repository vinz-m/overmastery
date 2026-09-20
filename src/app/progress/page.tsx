import { ProgressHome } from "@/features/progress/progress-home";
import { getProgressOverview } from "@/features/progress/data";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function ProgressPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { activeSessionId, exercises, sessions } = await getProgressOverview(
    supabase,
    user.id,
    user.unitSystem,
  );
  const accountLabel = user.displayName || user.email?.split("@")[0] || "You";

  return (
    <ProgressHome
      dayEndsAt={user.dayEndsAt}
      accountLabel={accountLabel}
      activeSessionId={activeSessionId}
      exercises={exercises}
      guidance={user.guidance}
      sessions={sessions}
      unitSystem={user.unitSystem}
    />
  );
}
