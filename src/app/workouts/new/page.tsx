import { CreateWorkoutBuilder } from "@/features/workouts/create-workout-builder";
import { getExerciseCatalog } from "@/features/workouts/data";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function NewWorkoutPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const catalog = await getExerciseCatalog(supabase, user.id);

  return (
    <CreateWorkoutBuilder
      catalog={catalog}
      initialGuidance={user.guidance}
    />
  );
}
