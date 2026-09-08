import { ExerciseLibrary } from "@/features/exercises/exercise-library";
import type { ExerciseCatalogItem } from "@/features/workouts/types";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function ExercisesPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data, error }, { data: activeSession, error: activeError }] =
    await Promise.all([
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
      supabase
        .from("training_sessions")
        .select("id")
        .eq("status", "active")
        .maybeSingle(),
    ]);

  if (error || activeError) {
    throw new Error("Exercise library could not be loaded.");
  }

  const catalog: ExerciseCatalogItem[] = (data ?? []).map((exercise) => ({
    id: exercise.id,
    isCustom: exercise.owner_user_id === user.id,
    name: exercise.name,
    trackingType: exercise.tracking_type,
  }));
  const accountLabel =
    user.displayName || user.email?.split("@")[0] || "You";

  return (
    <ExerciseLibrary
      dayEndsAt={user.dayEndsAt}
      accountLabel={accountLabel}
      activeSessionId={activeSession?.id}
      catalog={catalog}
    />
  );
}
