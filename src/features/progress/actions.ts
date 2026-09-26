"use server";

import { requireUserId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import { getWorkoutHistoryPage, workoutPageSize } from "./data";
import type { WorkoutHistoryPage } from "./types";

/** The next, older page of finished workouts, for the full history list. */
export async function loadOlderWorkouts(
  before: string,
): Promise<WorkoutHistoryPage> {
  if (typeof before !== "string" || !Number.isFinite(Date.parse(before)))
    return { nextCursor: null, workouts: [] };

  const userId = await requireUserId();
  const supabase = await createClient();
  return getWorkoutHistoryPage(supabase, userId, {
    before,
    limit: workoutPageSize,
  });
}
