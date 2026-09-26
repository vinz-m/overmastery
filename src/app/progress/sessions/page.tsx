import {
  getTrainingTotals,
  getWorkoutHistoryPage,
  workoutPageSize,
} from "@/features/progress/data";
import { WorkoutHistoryDetail } from "@/features/progress/history-detail";
import { requireUserId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageTransition } from "@/features/navigation/page-transition";

export default async function WorkoutHistoryPage() {
  const [userId, supabase] = await Promise.all([
    requireUserId(),
    createClient(),
  ]);
  const [initial, totals] = await Promise.all([
    getWorkoutHistoryPage(supabase, userId, { limit: workoutPageSize }),
    getTrainingTotals(supabase, userId),
  ]);

  return (
    <PageTransition>
      <WorkoutHistoryDetail initial={initial} total={totals.workouts} />
    </PageTransition>
  );
}
