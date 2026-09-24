import { getLatestPerformances } from "@/features/sessions/data";
import type { PreviousPerformance } from "@/features/sessions/types";
import { getWorkoutOverview } from "@/features/workouts/data";
import { WorkoutHome } from "@/features/workouts/home";
import { selectNextWorkout } from "@/features/workouts/workout-overview";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageTransition } from "@/features/navigation/page-transition";

export default async function Home() {
  const supabase = await createClient();
  const [user, overview] = await Promise.all([
    requireUser(),
    getWorkoutOverview(supabase),
  ]);

  // Last results for the suggested workout's exercises, so Today can show
  // what's coming. Skipped while a workout is in progress (no suggestion shown).
  const featured = overview.activeSession ? undefined : selectNextWorkout(overview.workouts);
  const featuredPrevious: Record<string, PreviousPerformance> = featured
    ? Object.fromEntries(
        await getLatestPerformances(
          supabase,
          featured.exercises.map((exercise) => exercise.exerciseId),
          { workoutTemplateId: featured.id },
        ),
      )
    : {};

  return (
    <PageTransition>
      <WorkoutHome
        activeSession={overview.activeSession}
        displayName={user.displayName}
        email={user.email}
        featuredPrevious={featuredPrevious}
        guidance={user.guidance}
        timeZone={user.timeZone}
        trainedAt={overview.trainedAt}
        unitSystem={user.unitSystem}
        workouts={overview.workouts}
      />
    </PageTransition>
  );
}
