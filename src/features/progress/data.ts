import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  comparePerformance,
  type PerformanceComparison,
} from "@/features/sessions/performance";
import type { PreviousPerformance, TrackingType } from "@/features/sessions/types";
import type { Database } from "@/lib/supabase/database.types";
import type { UnitSystem } from "@/lib/units";

import type { ExerciseTimeline, HistoryExercise, HistorySession } from "./types";

type Client = SupabaseClient<Database>;

type HistoryRow = {
  ended_at: string | null;
  id: string;
  session_exercises: Array<{
    exercise_id: string | null;
    exercise_name: string;
    exercise_sets: Array<{
      assistance_kg: number | null;
      planned_reps: number | null;
      position: number;
      reps: number | null;
      status: Database["public"]["Enums"]["set_status"];
      weight_kg: number | null;
    }>;
    id: string;
    position: number;
    status: Database["public"]["Enums"]["session_exercise_status"];
    tracking_type: TrackingType;
    workout_template_exercises: { target_sets: number } | null;
  }>;
  started_at: string;
  template_name: string | null;
};

const historySelection = `
  ended_at,
  id,
  started_at,
  template_name,
  session_exercises (
    exercise_id,
    exercise_name,
    id,
    position,
    status,
    tracking_type,
    workout_template_exercises ( target_sets ),
    exercise_sets (
      assistance_kg,
      planned_reps,
      position,
      reps,
      status,
      weight_kg
    )
  )
`;

// unitSystem arrives as a promise so the history query can start before the
// profile read finishes; it is only needed once rows are being shaped.
export async function getProgressOverview(
  supabase: Client,
  userId: string,
  unitSystem: Promise<UnitSystem>,
) {
  const [{ data, error }, units] = await Promise.all([
    supabase
      .from("training_sessions")
      .select(historySelection)
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("ended_at", { ascending: false })
      .limit(24),
    unitSystem,
  ]);

  if (error) throw new Error("Training history could not be loaded.");

  const sessions = buildHistory((data ?? []) as HistoryRow[], units);
  const exerciseIndex = buildExerciseIndex(sessions);

  return {
    exercises: [...exerciseIndex.values()]
      .sort((left, right) =>
        right.exposures[0].endedAt.localeCompare(left.exposures[0].endedAt),
      ),
    sessions,
  };
}

export async function getHistorySession(
  supabase: Client,
  userId: string,
  sessionId: string,
  unitSystem: Promise<UnitSystem>,
) {
  const { data: target, error: targetError } = await supabase
    .from("training_sessions")
    .select(historySelection)
    .eq("id", sessionId)
    .eq("user_id", userId)
    .eq("status", "completed")
    .maybeSingle();

  if (targetError) throw new Error("Session history could not be loaded.");
  const row = target as HistoryRow | null;
  if (!row?.ended_at) return null;

  const exerciseIds = row.session_exercises
    .map((exercise) => exercise.exercise_id)
    .filter((id): id is string => Boolean(id));
  const [{ data: previousRows, error }, units] = await Promise.all([
    exerciseIds.length > 0
      ? supabase.rpc("latest_exercise_performances", {
          p_ended_before: row.ended_at,
          p_exclude_session_id: row.id,
          p_exercise_ids: exerciseIds,
        })
      : { data: [], error: null },
    unitSystem,
  ]);

  if (error) throw new Error("Session history could not be loaded.");
  const previous = new Map<string, PreviousPerformance>(
    (previousRows ?? []).map((performance) => [
      performance.exercise_id,
      { loadKg: performance.load_kg, reps: performance.reps },
    ]),
  );

  return buildHistory([row], units, previous)[0] ?? null;
}

export async function getExerciseTimeline(
  supabase: Client,
  userId: string,
  exerciseId: string,
  unitSystem: Promise<UnitSystem>,
) {
  // Read only this exercise's rows instead of whole sessions.
  const [{ data, error }, units] = await Promise.all([
    supabase
      .from("session_exercises")
      .select(`
        exercise_id,
        exercise_name,
        id,
        position,
        status,
        tracking_type,
        workout_template_exercises ( target_sets ),
        exercise_sets (
          assistance_kg,
          planned_reps,
          position,
          reps,
          status,
          weight_kg
        ),
        training_sessions!inner ( ended_at, id, started_at, template_name )
      `)
      .eq("exercise_id", exerciseId)
      .eq("training_sessions.user_id", userId)
      .eq("training_sessions.status", "completed")
      .order("training_sessions(ended_at)", { ascending: false })
      .limit(100),
    unitSystem,
  ]);

  if (error) throw new Error("Exercise history could not be loaded.");

  const sessions = new Map<string, HistoryRow>();
  for (const { training_sessions: session, ...exercise } of data ?? []) {
    const existing = sessions.get(session.id);
    if (existing) {
      existing.session_exercises.push(exercise);
    } else {
      sessions.set(session.id, { ...session, session_exercises: [exercise] });
    }
  }

  return buildExerciseIndex(buildHistory([...sessions.values()], units)).get(
    exerciseId,
  ) ?? null;
}

function buildHistory(
  rows: HistoryRow[],
  unitSystem: UnitSystem,
  previousByExercise = new Map<string, PreviousPerformance>(),
): HistorySession[] {
  const chronological = [...rows].sort((left, right) =>
    (left.ended_at ?? left.started_at).localeCompare(
      right.ended_at ?? right.started_at,
    ),
  );

  const sessions = chronological.map((row) => {
    const exercises = [...row.session_exercises]
      .sort((left, right) => left.position - right.position)
      .map((exercise): HistoryExercise => {
        const completed = exercise.exercise_sets
          .filter((set) => set.status === "completed" && set.reps !== null)
          .sort((left, right) => left.position - right.position);
        const current: PreviousPerformance | null = completed.length
          ? {
              loadKg:
                exercise.tracking_type === "assistance_reps"
                  ? completed[0].assistance_kg
                  : completed[0].weight_kg,
              reps: completed.map((set) => set.reps!),
            }
          : null;
        const previous = exercise.exercise_id
          ? previousByExercise.get(exercise.exercise_id)
          : undefined;
        const comparison: PerformanceComparison = previous
          ? comparePerformance(current, previous, exercise.tracking_type, unitSystem)
          : current
            ? { label: "Baseline recorded", state: "new" }
            : { label: "No completed sets", state: "new" };
        const storedPlannedSets = exercise.exercise_sets.filter(
          (set) => set.planned_reps !== null,
        ).length;
        const plannedSets =
          exercise.workout_template_exercises?.target_sets ??
          storedPlannedSets;
        const plannedCompletedSets = completed.filter((set) =>
          exercise.workout_template_exercises
            ? set.position < plannedSets
            : set.planned_reps !== null,
        ).length;

        if (exercise.exercise_id && current) {
          previousByExercise.set(exercise.exercise_id, current);
        }

        return {
          comparison,
          completedSets: completed.length,
          extraCompletedSets: completed.length - plannedCompletedSets,
          exerciseId: exercise.exercise_id,
          id: exercise.id,
          loadKg: current?.loadKg ?? null,
          name: exercise.exercise_name,
          plannedSets,
          plannedCompletedSets,
          reps: current?.reps ?? [],
          skippedSets: exercise.exercise_sets.filter(
            (set) => set.status === "skipped" && set.planned_reps !== null,
          ).length,
          trackingType: exercise.tracking_type,
        };
      });

    return {
      completedSets: exercises.reduce(
        (total, exercise) => total + exercise.completedSets,
        0,
      ),
      endedAt: row.ended_at ?? row.started_at,
      exercises,
      id: row.id,
      improvedExercises: exercises.filter(
        (exercise) => exercise.comparison.state === "improved",
      ).length,
      startedAt: row.started_at,
      templateName: row.template_name ?? "Training session",
    };
  });

  return sessions.reverse();
}

function buildExerciseIndex(sessions: HistorySession[]) {
  const timelines = new Map<string, ExerciseTimeline>();

  for (const session of [...sessions].reverse()) {
    for (const exercise of session.exercises) {
      if (!exercise.exerciseId || exercise.completedSets === 0) continue;
      const exposure = {
        ...exercise,
        endedAt: session.endedAt,
        sessionId: session.id,
        templateName: session.templateName,
      };
      const existing = timelines.get(exercise.exerciseId);
      if (existing) {
        existing.exposures.push(exposure);
      } else {
        timelines.set(exercise.exerciseId, {
          exerciseId: exercise.exerciseId,
          exposures: [exposure],
          name: exercise.name,
          trackingType: exercise.trackingType,
        });
      }
    }
  }

  return timelines;
}
