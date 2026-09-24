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
  const userPromise = requireUser();
  const [user, { exercises, sessions }] = await Promise.all([
    userPromise,
    getProgressOverview(
      supabase,
      userId,
      userPromise.then((user) => user.unitSystem),
    ),
  ]);

  return (
    <PageTransition>
      <ProgressHome
        exercises={exercises}
        guidance={user.guidance}
        sessions={sessions}
        unitSystem={user.unitSystem}
      />
    </PageTransition>
  );
}
