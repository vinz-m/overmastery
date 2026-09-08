import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import type { HomeActiveSession, HomeWorkout } from "./home";
import type { WorkoutTemplateDraft } from "./types";

type Client = SupabaseClient<Database>;

export async function getWorkoutOverview(supabase: Client) {
  const [{ data, error }, { data: activeData, error: activeError }, { data: historyData, error: historyError }] =
    await Promise.all([
      supabase
        .from("workout_templates")
        .select(`
          id,
          name,
          workout_template_exercises (
            id,
            position,
            target_rep_max,
            target_rep_min,
            target_sets,
            exercises ( name )
          )
        `)
        .is("archived_at", null)
        .order("created_at"),
      supabase
        .from("training_sessions")
        .select("id, started_at, template_name")
        .eq("status", "active")
        .maybeSingle(),
      supabase
        .from("training_sessions")
        .select("ended_at, source_workout_template_id")
        .eq("status", "completed")
        .not("source_workout_template_id", "is", null)
        .order("ended_at", { ascending: false }),
    ]);

  if (error || activeError || historyError) {
    throw new Error("Workouts could not be loaded.");
  }

  const activeSession: HomeActiveSession | undefined = activeData
    ? {
        id: activeData.id,
        startedAt: activeData.started_at,
        templateName: activeData.template_name ?? "Workout",
      }
    : undefined;

  const workouts: HomeWorkout[] = (data ?? []).map((workout) => {
    const exercises = [...workout.workout_template_exercises].sort(
      (left, right) => left.position - right.position,
    );
    const firstExercise = exercises[0];
    const lastSession = historyData?.find(
      (session) => session.source_workout_template_id === workout.id,
    );

    return {
      exerciseCount: exercises.length,
      id: workout.id,
      firstTarget: firstExercise?.exercises?.name
        ? `${firstExercise.exercises.name} · ${firstExercise.target_sets} × ${formatRepTarget(firstExercise.target_rep_min, firstExercise.target_rep_max)}`
        : undefined,
      lastTrainedAt: lastSession?.ended_at ?? undefined,
      name: workout.name,
      preview: exercises
        .map((item) => item.exercises?.name)
        .filter((name): name is string => Boolean(name))
        .slice(0, 3),
    };
  });

  return { activeSession, workouts };
}

function formatRepTarget(minimum: number | null, maximum: number | null) {
  if (minimum === maximum && minimum !== null) return `${minimum} reps`;
  return `${minimum ?? "—"}–${maximum ?? "—"} reps`;
}

export async function getWorkoutTemplate(
  supabase: Client,
  workoutId: string,
): Promise<WorkoutTemplateDraft | null> {
  const { data, error } = await supabase
    .from("workout_templates")
    .select(`
      id,
      name,
      workout_template_exercises (
        default_rest_seconds,
        position,
        target_rep_max,
        target_rep_min,
        target_sets,
        exercises ( id, name, owner_user_id, tracking_type )
      )
    `)
    .eq("id", workoutId)
    .is("archived_at", null)
    .maybeSingle();

  if (error) throw new Error("Workout could not be loaded.");
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    exercises: [...data.workout_template_exercises]
      .sort((left, right) => left.position - right.position)
      .flatMap((item) => item.exercises ? [{
        defaultRestSeconds: item.default_rest_seconds ?? 120,
        id: item.exercises.id,
        isCustom: item.exercises.owner_user_id !== null,
        name: item.exercises.name,
        targetRepMax: item.target_rep_max ?? 12,
        targetRepMin: item.target_rep_min ?? 8,
        targetSets: item.target_sets,
        trackingType: item.exercises.tracking_type,
      }] : []),
  };
}
