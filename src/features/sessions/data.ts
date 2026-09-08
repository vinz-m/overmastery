import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import type {
  ActiveExercise,
  ActiveSession,
  PreviousPerformance,
  SwapExerciseOption,
  TrackingType,
} from "./types";

type Client = SupabaseClient<Database>;

type PreviousSessionRow = {
  session_exercises: Array<{
    exercise_id: string | null;
    exercise_sets: Array<{
      assistance_kg: number | null;
      position: number;
      reps: number | null;
      status: Database["public"]["Enums"]["set_status"];
      weight_kg: number | null;
    }>;
    tracking_type: TrackingType;
  }>;
};

export async function getSessionWorkspace(
  supabase: Client,
  sessionId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("training_sessions")
    .select(`
      id,
      started_at,
      template_name,
      status,
      session_exercises (
        id,
        exercise_id,
        exercise_name,
        position,
        status,
        tracking_type,
        workout_template_exercises (
          default_rest_seconds,
          target_rep_max,
          target_rep_min,
          target_sets
        ),
        exercise_sets (
          assistance_kg,
          id,
          planned_reps,
          position,
          reps,
          status,
          weight_kg
        )
      )
    `)
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;

  const exerciseIds = data.session_exercises
    .map((exercise) => exercise.exercise_id)
    .filter((id): id is string => Boolean(id));
  const previous = await getPreviousPerformances(
    supabase,
    userId,
    data.id,
    exerciseIds,
  );

  const exercises: ActiveExercise[] = data.session_exercises
    .map((exercise) => {
      const source = exercise.workout_template_exercises;
      const trackingType = exercise.tracking_type;
      const storedPlannedSetCount = exercise.exercise_sets.filter(
        (set) => set.planned_reps !== null,
      ).length;
      const targetSets =
        source?.target_sets ??
        (storedPlannedSetCount > 0
          ? storedPlannedSetCount
          : exercise.exercise_sets.length);

      return {
        defaultRestSeconds: source?.default_rest_seconds ?? null,
        exerciseId: exercise.exercise_id!,
        id: exercise.id,
        name: exercise.exercise_name,
        position: exercise.position,
        previous: previous.get(exercise.exercise_id!) ?? {
          loadKg: null,
          reps: [],
        },
        sets: exercise.exercise_sets
          .map((set) => ({
            id: set.id,
            isPlanned: source
              ? set.position < targetSets
              : storedPlannedSetCount > 0
                ? set.planned_reps !== null
                : true,
            loadKg:
              trackingType === "assistance_reps"
                ? set.assistance_kg
                : set.weight_kg,
            plannedReps: set.planned_reps,
            position: set.position,
            reps: set.reps,
            status: set.status,
          }))
          .sort((left, right) => left.position - right.position),
        status: exercise.status,
        targetSets,
        targetRepMax: source?.target_rep_max ?? null,
        targetRepMin: source?.target_rep_min ?? null,
        trackingType,
      };
    })
    .sort((left, right) => left.position - right.position);

  const session: ActiveSession = {
    exercises,
    id: data.id,
    startedAt: data.started_at,
    templateName: data.template_name ?? "Workout",
  };

  const { data: catalogData } = await supabase
    .from("exercises")
    .select("id, name, tracking_type")
    .is("archived_at", null)
    .in("tracking_type", [
      "weight_reps",
      "bodyweight_reps",
      "added_weight_reps",
      "assistance_reps",
    ])
    .order("name");

  const catalog: SwapExerciseOption[] = (catalogData ?? []).map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
    trackingType: exercise.tracking_type,
  }));

  return { catalog, session, status: data.status };
}

async function getPreviousPerformances(
  supabase: Client,
  userId: string,
  currentSessionId: string,
  exerciseIds: string[],
) {
  const performances = new Map<string, PreviousPerformance>();
  if (exerciseIds.length === 0) return performances;

  const { data } = await supabase
    .from("training_sessions")
    .select(`
      session_exercises (
        exercise_id,
        tracking_type,
        exercise_sets (
          assistance_kg,
          position,
          reps,
          status,
          weight_kg
        )
      )
    `)
    .eq("user_id", userId)
    .eq("status", "completed")
    .neq("id", currentSessionId)
    .order("ended_at", { ascending: false })
    .limit(30);

  for (const session of (data ?? []) as PreviousSessionRow[]) {
    for (const exercise of session.session_exercises) {
      const exerciseId = exercise.exercise_id;
      if (!exerciseId || performances.has(exerciseId)) continue;

      const sets = exercise.exercise_sets
        .filter(
          (set) => set.status === "completed" && set.reps !== null,
        )
        .sort((left, right) => left.position - right.position);
      if (sets.length === 0) continue;

      performances.set(exerciseId, {
        loadKg:
          exercise.tracking_type === "assistance_reps"
            ? sets[0].assistance_kg
            : sets[0].weight_kg,
        reps: sets.map((set) => set.reps!),
      });
    }
  }

  return performances;
}
