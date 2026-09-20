import { notFound } from "next/navigation";

import { CreateWorkoutBuilder } from "@/features/workouts/create-workout-builder";
import { getExerciseCatalog, getWorkoutTemplate } from "@/features/workouts/data";
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
  const [workout, catalog] = await Promise.all([
    getWorkoutTemplate(supabase, workoutId),
    getExerciseCatalog(supabase, user.id),
  ]);

  if (!workout) notFound();

  return (
    <CreateWorkoutBuilder
      catalog={catalog}
      initialGuidance={user.guidance}
      workout={workout}
    />
  );
}
