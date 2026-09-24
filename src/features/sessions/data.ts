import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { getExerciseCatalog } from "@/features/workouts/data";

import type {
  ActiveExercise,
  ActiveSession,
  PreviousPerformance,
  SwapExerciseOption,
} from "./types";

type Client = SupabaseClient<Database>;

export async function getSessionWorkspace(
  supabase: Client,
  sessionId: string,
  userId: string,
) {
  // The swap catalog doesn't depend on the session, so load it alongside.
  const catalogPromise = getExerciseCatalog(supabase, userId);
  const { data, error } = await supabase
    .from("training_sessions")
    .select(`
      id,
      source_workout_template_id,
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
    data.id,
    data.source_workout_template_id,
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

  const catalog: SwapExerciseOption[] = (await catalogPromise).map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
    trackingType: exercise.trackingType,
  }));

  return { catalog, session, status: data.status };
}

// Prefers the last time this exercise was done in the same workout, since the
// same exercise is often trained differently across workouts. Falls back to
// the latest session of that exercise from any workout.
async function getPreviousPerformances(
  supabase: Client,
  currentSessionId: string,
  workoutTemplateId: string | null,
  exerciseIds: string[],
) {
  const performances = new Map<string, PreviousPerformance>();
  if (exerciseIds.length === 0) return performances;

  const [{ data: anyWorkout }, { data: sameWorkout }] = await Promise.all([
    supabase.rpc("latest_exercise_performances", {
      p_exclude_session_id: currentSessionId,
      p_exercise_ids: exerciseIds,
    }),
    workoutTemplateId
      ? supabase.rpc("latest_exercise_performances", {
          p_exclude_session_id: currentSessionId,
          p_exercise_ids: exerciseIds,
          p_workout_template_id: workoutTemplateId,
        })
      : { data: [] },
  ]);

  for (const row of [...(anyWorkout ?? []), ...(sameWorkout ?? [])]) {
    performances.set(row.exercise_id, { loadKg: row.load_kg, reps: row.reps });
  }

  return performances;
}
