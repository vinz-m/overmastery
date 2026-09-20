import {
  WorkoutHome,
} from "@/features/workouts/home";
import { getWorkoutOverview } from "@/features/workouts/data";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const user = await requireUser();
  const supabase = await createClient();
  const { activeSession, lastTrainedAt, workouts } =
    await getWorkoutOverview(supabase);

  return (
    <WorkoutHome
      dayEndsAt={user.dayEndsAt}
      activeSession={activeSession}
      displayName={user.displayName}
      email={user.email}
      guidance={user.guidance}
      lastTrainedAt={lastTrainedAt}
      timeZone={user.timeZone}
      workouts={workouts}
    />
  );
}
