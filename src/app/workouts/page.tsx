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
  const user = await requireUser();
  const supabase = await createClient();
  const [{ activeSession, workouts }, catalog, archivedCatalog] = await Promise.all([
    getWorkoutOverview(supabase),
    getExerciseCatalog(supabase, user.id),
    getArchivedCustomExercises(supabase, user.id),
  ]);
  const planningView =
    (await searchParams).view === "exercises" ? "exercises" : "workouts";

  return (
    <WorkoutHome
      dayEndsAt={user.dayEndsAt}
      activeSession={activeSession}
      archivedCatalog={archivedCatalog}
      catalog={catalog}
      displayName={user.displayName}
      email={user.email}
      guidance={user.guidance}
      planningView={planningView}
      timeZone={user.timeZone}
      view="workouts"
      workouts={workouts}
    />
  );
}
