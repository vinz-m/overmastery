import { CreateWorkoutBuilder } from "@/features/workouts/create-workout-builder";
import type { ExerciseCatalogItem } from "@/features/workouts/types";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function NewWorkoutPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .select("id, name, owner_user_id, tracking_type")
    .is("archived_at", null)
    .in("tracking_type", [
      "weight_reps",
      "bodyweight_reps",
      "added_weight_reps",
      "assistance_reps",
    ])
    .order("name");

  if (error) {
    throw new Error("Exercise library could not be loaded.");
  }

  const catalog: ExerciseCatalogItem[] = (data ?? []).map((exercise) => ({
    id: exercise.id,
    isCustom: exercise.owner_user_id === user.id,
    name: exercise.name,
    trackingType: exercise.tracking_type,
  }));

  return (
    <CreateWorkoutBuilder
      catalog={catalog}
      initialGuidance={user.guidance}
    />
  );
}
