import { getWorkoutOverview } from "@/features/workouts/data";
import { WorkoutHome } from "@/features/workouts/home";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function WorkoutsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { activeSession, workouts } = await getWorkoutOverview(supabase);

  return (
    <WorkoutHome
      dayEndsAt={user.dayEndsAt}
      activeSession={activeSession}
      displayName={user.displayName}
      email={user.email}
      guidance={user.guidance}
      view="workouts"
      workouts={workouts}
    />
  );
}
