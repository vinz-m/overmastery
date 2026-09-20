import {
  getArchivedCustomExercises,
  getExerciseCatalog,
  getWorkoutOverview,
} from "@/features/workouts/data";
import { WorkoutHome } from "@/features/workouts/home";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function WorkoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const supabase = await createClient();
  const overviewPromise = getWorkoutOverview(supabase);
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const [overview, catalog, archivedCatalog] = await Promise.all([
    overviewPromise,
    getExerciseCatalog(supabase, user.id),
    getArchivedCustomExercises(supabase, user.id),
  ]);
  const planningView = params.view === "exercises" ? "exercises" : "workouts";

  return (
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
  );
}
