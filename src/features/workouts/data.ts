import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import type { HomeActiveSession, HomeWorkout } from "./home";
import { supportedTrackingTypes } from "./tracking";
import type { WorkoutTemplateDraft } from "./types";

type Client = SupabaseClient<Database>;

const globalExerciseCacheTtlMs = 60 * 60 * 1000;

type CatalogRows = Awaited<ReturnType<typeof fetchGlobalExercises>>;
let globalExerciseCache: { expiresAt: number; rows: CatalogRows } | undefined;

async function fetchGlobalExercises(supabase: Client) {
  const { data, error } = await supabase
    .from("exercises")
    .select(
      `
      id,
      name,
      owner_user_id,
      tracking_type,
      exercise_muscles (
        position,
        role,
        muscle_groups ( name, slug )
      )
    `,
    )
    .is("archived_at", null)
    .is("owner_user_id", null)
    .in("tracking_type", supportedTrackingTypes)
    .order("name");

  if (error) throw new Error("Exercise library could not be loaded.");
  return data ?? [];
}

async function fetchCustomExercises(supabase: Client, userId: string) {
  const { data, error } = await supabase
    .from("exercises")
    .select(
      `
      id,
      name,
      owner_user_id,
      tracking_type,
      exercise_muscles (
        position,
        role,
        muscle_groups ( name, slug )
      )
    `,
    )
    .is("archived_at", null)
    .eq("owner_user_id", userId)
    .in("tracking_type", supportedTrackingTypes)
    .order("name");

  if (error) throw new Error("Exercise library could not be loaded.");
  return data ?? [];
}

async function getGlobalExercises(supabase: Client) {
  const now = Date.now();
  if (globalExerciseCache && globalExerciseCache.expiresAt > now) {
    return globalExerciseCache.rows;
  }

  const rows = await fetchGlobalExercises(supabase);
  globalExerciseCache = {
    expiresAt: now + globalExerciseCacheTtlMs,
    rows,
  };
  return rows;
}

export async function getExerciseCatalog(supabase: Client, userId: string) {
  const [globalExercises, customExercises] = await Promise.all([
    getGlobalExercises(supabase),
    fetchCustomExercises(supabase, userId),
  ]);

  return [...globalExercises, ...customExercises]
    .map((exercise) => {
      const primaryMuscle = [...exercise.exercise_muscles]
        .sort((left, right) => left.position - right.position)
        .find((muscle) => muscle.role === "primary")?.muscle_groups;

      return {
        id: exercise.id,
        isArchived: false,
        isCustom: exercise.owner_user_id === userId,
        name: exercise.name,
        primaryMuscle: primaryMuscle ?? undefined,
        trackingType: exercise.tracking_type,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function getArchivedCustomExercises(
  supabase: Client,
  userId: string,
) {
  const { data, error } = await supabase
    .from("exercises")
    .select("id, name, tracking_type")
    .eq("owner_user_id", userId)
    .not("archived_at", "is", null)
    .in("tracking_type", supportedTrackingTypes)
    .order("archived_at", { ascending: false });

  if (error) throw new Error("Archived exercises could not be loaded.");

  return (data ?? []).map((exercise) => ({
    id: exercise.id,
    isArchived: true,
    isCustom: true,
    name: exercise.name,
    trackingType: exercise.tracking_type,
  }));
}

// The week strip looks back at most two weeks; a day of margin covers any time zone.
const recentTrainingWindowMs = 15 * 24 * 60 * 60 * 1000;

export async function getWorkoutOverview(supabase: Client) {
  const recentSince = new Date(
    Date.now() - recentTrainingWindowMs,
  ).toISOString();
  const [
    { data, error },
    { data: activeData, error: activeError },
    { data: historyData, error: historyError },
  ] = await Promise.all([
    supabase
      .from("workout_templates")
      .select(
        `
          id,
          name,
          workout_template_exercises (
            id,
            position,
            target_rep_max,
            target_rep_min,
            target_sets,
            exercises ( id, name, tracking_type )
          ),
          training_sessions ( ended_at )
        `,
      )
      .is("archived_at", null)
      // Only each plan's most recent completed session, not its whole history.
      .eq("training_sessions.status", "completed")
      .order("ended_at", {
        ascending: false,
        referencedTable: "training_sessions",
      })
      .limit(1, { referencedTable: "training_sessions" })
      .order("created_at"),
    supabase
      .from("training_sessions")
      .select("id, started_at, template_name")
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("training_sessions")
      .select("ended_at")
      .eq("status", "completed")
      .gte("ended_at", recentSince),
  ]);

  if (error || activeError || historyError) {
    // Keep the Supabase error so the server log shows which query failed and why.
    throw new Error("Workouts could not be loaded.", {
      cause: error ?? activeError ?? historyError,
    });
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
    const lastSession = workout.training_sessions[0];

    return {
      exerciseCount: exercises.length,
      id: workout.id,
      firstTarget: firstExercise?.exercises?.name
        ? `${firstExercise.exercises.name} · ${firstExercise.target_sets} × ${formatRepTarget(firstExercise.target_rep_min, firstExercise.target_rep_max)}`
        : undefined,
      lastTrainedAt: lastSession?.ended_at ?? undefined,
      exercises: exercises
        .filter((item) => item.exercises)
        .map((item) => ({
          exerciseId: item.exercises!.id,
          name: item.exercises!.name,
          trackingType: item.exercises!.tracking_type,
        })),
      name: workout.name,
      preview: exercises
        .map((item) => item.exercises?.name)
        .filter((name): name is string => Boolean(name))
        .slice(0, 3),
    };
  });

  return {
    activeSession,
    trainedAt: (historyData ?? [])
      .map((session) => session.ended_at)
      .filter((endedAt): endedAt is string => Boolean(endedAt)),
    workouts,
  };
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
    .select(
      `
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
    `,
    )
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
      .flatMap((item) =>
        item.exercises
          ? [
              {
                defaultRestSeconds: item.default_rest_seconds ?? 120,
                id: item.exercises.id,
                isCustom: item.exercises.owner_user_id !== null,
                name: item.exercises.name,
                targetRepMax: item.target_rep_max ?? 12,
                targetRepMin: item.target_rep_min ?? 8,
                targetSets: item.target_sets,
                trackingType: item.exercises.tracking_type,
              },
            ]
          : [],
      ),
  };
}
