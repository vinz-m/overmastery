import { notFound } from "next/navigation";

import { getExerciseTimeline } from "@/features/progress/data";
import { ExerciseHistoryDetail } from "@/features/progress/history-detail";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function ExerciseHistoryPage({
  params,
}: PageProps<"/progress/exercises/[exerciseId]">) {
  const { exerciseId } = await params;
  if (!uuidPattern.test(exerciseId)) notFound();

  const user = await requireUser();
  const supabase = await createClient();
  const timeline = await getExerciseTimeline(supabase, user.id, exerciseId, user.unitSystem);
  if (!timeline) notFound();

  return <ExerciseHistoryDetail timeline={timeline} unitSystem={user.unitSystem} />;
}
