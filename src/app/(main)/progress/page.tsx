import { getProgressOverview } from "@/features/progress/data";
import { ProgressHome } from "@/features/progress/progress-home";
import { requireUser, requireUserId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageTransition } from "@/features/navigation/page-transition";

export default async function ProgressPage() {
  const [userId, supabase] = await Promise.all([
    requireUserId(),
    createClient(),
  ]);
  const [user, { exercises, recent, totals }] = await Promise.all([
    requireUser(),
    getProgressOverview(supabase, userId),
  ]);

  return (
    <PageTransition>
      <ProgressHome
        exercises={exercises}
        guidance={user.guidance}
        recent={recent}
        totals={totals}
        unitSystem={user.unitSystem}
      />
    </PageTransition>
  );
}
