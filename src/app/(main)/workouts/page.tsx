import {
  getArchivedCustomExercises,
  getExerciseCatalog,
  getWorkoutOverview,
} from "@/features/workouts/data";
import { closeIdleSession } from "@/features/sessions/idle-session";
import { WorkoutHome } from "@/features/workouts/home";
import { requireUser, requireUserId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageTransition } from "@/features/navigation/page-transition";

export default async function WorkoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const [userId, supabase] = await Promise.all([
    requireUserId(),
    createClient(),
  ]);
  const [user, params, overview, catalog, archivedCatalog] = await Promise.all([
    requireUser(),
    searchParams,
    closeIdleSession(userId).then(() => getWorkoutOverview(supabase)),
    getExerciseCatalog(supabase, userId),
    getArchivedCustomExercises(supabase, userId),
  ]);
  const planningView = params.view === "exercises" ? "exercises" : "workouts";

  return (
    <PageTransition>
      <WorkoutHome
        activeSession={overview.activeSession}
        archivedCatalog={archivedCatalog}
        catalog={catalog}
        displayName={user.displayName}
        email={user.email}
        guidance={user.guidance}
        planningView={planningView}
        timeZone={user.timeZone}
        view="workouts"
        workouts={overview.workouts}
      />
    </PageTransition>
  );
}
