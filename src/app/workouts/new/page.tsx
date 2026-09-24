import { CreateWorkoutBuilder } from "@/features/workouts/create-workout-builder";
import { getExerciseCatalog } from "@/features/workouts/data";
import { requireUser, requireUserId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function NewWorkoutPage() {
  const [userId, supabase] = await Promise.all([requireUserId(), createClient()]);
  const [user, catalog] = await Promise.all([
    requireUser(),
    getExerciseCatalog(supabase, userId),
  ]);

  return (
    <CreateWorkoutBuilder
      catalog={catalog}
      initialGuidance={user.guidance}
    />
  );
}
