import { notFound } from "next/navigation";

import { CreateWorkoutBuilder } from "@/features/workouts/create-workout-builder";
import { getWorkoutTemplate } from "@/features/workouts/data";
import type { ExerciseCatalogItem } from "@/features/workouts/types";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function EditWorkoutPage({
  params,
}: PageProps<"/workouts/[workoutId]/edit">) {
  const { workoutId } = await params;
  if (!uuidPattern.test(workoutId)) notFound();

  const user = await requireUser();
  const supabase = await createClient();
  const [workout, catalogResult] = await Promise.all([
    getWorkoutTemplate(supabase, workoutId),
    supabase
      .from("exercises")
      .select("id, name, owner_user_id, tracking_type")
      .is("archived_at", null)
      .in("tracking_type", [
        "weight_reps",
        "bodyweight_reps",
        "added_weight_reps",
        "assistance_reps",
      ])
      .order("name"),
  ]);

  if (!workout) notFound();
  if (catalogResult.error) throw new Error("Exercise library could not be loaded.");

  const catalog: ExerciseCatalogItem[] = (catalogResult.data ?? []).map((exercise) => ({
    id: exercise.id,
    isCustom: exercise.owner_user_id === user.id,
    name: exercise.name,
    trackingType: exercise.tracking_type,
  }));

  return (
    <CreateWorkoutBuilder
      catalog={catalog}
      initialGuidance={user.guidance}
      workout={workout}
    />
  );
}
