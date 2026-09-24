import { notFound } from "next/navigation";

import { getExerciseTimeline } from "@/features/progress/data";
import { ExerciseHistoryDetail } from "@/features/progress/history-detail";
import { requireUser, requireUserId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageTransition } from "@/features/navigation/page-transition";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function ExerciseHistoryPage({
  params,
}: PageProps<"/progress/exercises/[exerciseId]">) {
  const { exerciseId } = await params;
  if (!uuidPattern.test(exerciseId)) notFound();

  const [userId, supabase] = await Promise.all([
    requireUserId(),
    createClient(),
  ]);
  const userPromise = requireUser();
  const [user, timeline] = await Promise.all([
    userPromise,
    getExerciseTimeline(
      supabase,
      userId,
      exerciseId,
      userPromise.then((user) => user.unitSystem),
    ),
  ]);
  if (!timeline) notFound();

  return (
    <PageTransition>
      <ExerciseHistoryDetail timeline={timeline} unitSystem={user.unitSystem} />
    </PageTransition>
  );
}
