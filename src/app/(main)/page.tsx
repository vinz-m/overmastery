import { getWorkoutOverview } from "@/features/workouts/data";
import { WorkoutHome } from "@/features/workouts/home";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const [user, overview] = await Promise.all([
    requireUser(),
    getWorkoutOverview(supabase),
  ]);

  return (
    <WorkoutHome
      activeSession={overview.activeSession}
      displayName={user.displayName}
      email={user.email}
      guidance={user.guidance}
      lastTrainedAt={overview.lastTrainedAt}
      timeZone={user.timeZone}
      workouts={overview.workouts}
    />
  );
}
