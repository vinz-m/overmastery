import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  comparePerformance,
  type PerformanceComparison,
} from "@/features/sessions/performance";
import type {
  PreviousPerformance,
  TrackingType,
} from "@/features/sessions/types";
import type { Database } from "@/lib/supabase/database.types";
import type { UnitSystem } from "@/lib/units";

import type {
  ExerciseSummary,
  ExerciseTimeline,
  HistoryExercise,
  HistorySession,
  TrainingTotals,
  WorkoutHistoryPage,
  WorkoutListItem,
} from "./types";

type Client = SupabaseClient<Database>;

type HistoryRow = {
  ended_at: string | null;
  id: string;
  session_exercises: Array<{
    exercise_id: string | null;
    exercise_name: string;
    exercise_sets: Array<{
      assistance_kg: number | null;
      entered_unit: UnitSystem | null;
      id: string;
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
    target_sets: number | null;
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
    target_sets,
    exercise_sets (
      assistance_kg,
      entered_unit,
      id,
      planned_reps,
      position,
      reps,
      status,
      weight_kg
    )
  )
`;

/** How many recent workouts the Progress tab lists before "See all". */
export const recentWorkoutCount = 10;
/** How many workouts each page of the full history loads. */
export const workoutPageSize = 20;

export async function getProgressOverview(supabase: Client, userId: string) {
  const [recent, totals, exercises] = await Promise.all([
    getWorkoutHistoryPage(supabase, userId, { limit: recentWorkoutCount }),
    getTrainingTotals(supabase, userId),
    getExerciseSummaries(supabase),
  ]);
  return { exercises, recent, totals };
}

/** Finished workouts, newest first, a page at a time. */
export async function getWorkoutHistoryPage(
  supabase: Client,
  userId: string,
  { before, limit }: { before?: string; limit: number },
): Promise<WorkoutHistoryPage> {
  let query = supabase
    .from("training_sessions")
    .select(historySelection)
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("ended_at", { ascending: false })
    // One extra row says whether an older page exists.
    .limit(limit + 1);
  if (before) query = query.lt("ended_at", before);
  const { data, error } = await query;
  if (error) throw new Error("Training history could not be loaded.");

  const rows = (data ?? []) as HistoryRow[];
  const page = rows.slice(0, limit);
  const oldest = page.at(-1);
  // Each workout is compared with the time before it, so start from how each
  // exercise stood before this page; otherwise the oldest workouts on it could
  // never show an improvement.
  const previous = oldest?.ended_at
    ? await getPerformancesBefore(supabase, page, oldest.ended_at)
    : undefined;
  // Only the comparison state is kept, which doesn't depend on the unit.
  const workouts = buildHistory(page, "metric", previous).map(
    (session): WorkoutListItem => ({
      completedSets: session.completedSets,
      doneExercises: session.exercises.filter(
        (exercise) => exercise.completedSets > 0,
      ).length,
      endedAt: session.endedAt,
      id: session.id,
      improvedExercises: session.improvedExercises,
      templateName: session.templateName,
    }),
  );

  return {
    nextCursor:
      rows.length > limit && oldest?.ended_at ? oldest.ended_at : null,
    workouts,
  };
}

async function getPerformancesBefore(
  supabase: Client,
  rows: HistoryRow[],
  endedBefore: string,
) {
  const exerciseIds = [
    ...new Set(
      rows.flatMap((row) =>
        row.session_exercises
          .map((exercise) => exercise.exercise_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ),
  ];
  if (exerciseIds.length === 0) return new Map<string, PreviousPerformance>();
  const { data, error } = await supabase.rpc("latest_exercise_performances", {
    p_ended_before: endedBefore,
    p_exercise_ids: exerciseIds,
  });
  if (error) throw new Error("Training history could not be loaded.");
  return toPerformances(data ?? []);
}

/** All-time counts, not just what's listed. */
export async function getTrainingTotals(
  supabase: Client,
  userId: string,
): Promise<TrainingTotals> {
  const [workouts, sets] = await Promise.all([
    supabase
      .from("training_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed"),
    supabase
      .from("exercise_sets")
      .select(
        "id, session_exercises!inner ( training_sessions!inner ( status, user_id ) )",
        { count: "exact", head: true },
      )
      .eq("status", "completed")
      .eq("session_exercises.training_sessions.status", "completed")
      .eq("session_exercises.training_sessions.user_id", userId),
  ]);
  if (workouts.error || sets.error)
    throw new Error("Training history could not be loaded.");
  return { sets: sets.count ?? 0, workouts: workouts.count ?? 0 };
}

/** Every exercise ever completed, most recently done first. */
async function getExerciseSummaries(
  supabase: Client,
): Promise<ExerciseSummary[]> {
  const { data, error } = await supabase.rpc("exercise_history_summaries");
  if (error) throw new Error("Exercise history could not be loaded.");
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const { data: latestRows, error: latestError } = await supabase.rpc(
    "latest_exercise_performances",
    { p_exercise_ids: rows.map((row) => row.exercise_id) },
  );
  if (latestError) throw new Error("Exercise history could not be loaded.");
  const latest = toPerformances(latestRows ?? []);

  return rows.map((row) => ({
    id: row.exercise_id,
    isCustom: row.is_custom,
    lastDoneAt: row.last_ended_at,
    latest: latest.get(row.exercise_id) ?? null,
    name: row.exercise_name,
    primaryMuscle:
      row.primary_muscle_name && row.primary_muscle_slug
        ? { name: row.primary_muscle_name, slug: row.primary_muscle_slug }
        : undefined,
    timesDone: row.exposure_count,
    trackingType: row.tracking_type,
  }));
}

function toPerformances(
  rows: Database["public"]["Functions"]["latest_exercise_performances"]["Returns"],
) {
  return new Map<string, PreviousPerformance>(
    rows.map((row) => [
      row.exercise_id,
      { loadKg: row.load_kg, reps: row.reps, unit: row.load_unit },
    ]),
  );
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

  if (targetError) throw new Error("This workout couldn’t be loaded.");
  const row = target as HistoryRow | null;
  if (!row?.ended_at) return null;

  const exerciseIds = row.session_exercises
    .map((exercise) => exercise.exercise_id)
    .filter((id): id is string => Boolean(id));
  const noRows = { data: [], error: null };
  const [
    { data: previousRows, error },
    { data: latestRows, error: latestError },
    units,
  ] = await Promise.all([
    exerciseIds.length > 0
      ? supabase.rpc("latest_exercise_performances", {
          p_ended_before: row.ended_at,
          p_exclude_session_id: row.id,
          p_exercise_ids: exerciseIds,
        })
      : noRows,
    // The unit each exercise was last logged in, which it reads in everywhere.
    exerciseIds.length > 0
      ? supabase.rpc("latest_exercise_performances", {
          p_exercise_ids: exerciseIds,
        })
      : noRows,
    unitSystem,
  ]);

  if (error || latestError) throw new Error("This workout couldn’t be loaded.");
  const previous = toPerformances(previousRows ?? []);
  const displayUnits = new Map(
    (latestRows ?? []).map((latest) => [
      latest.exercise_id,
      latest.load_unit ?? units,
    ]),
  );

  return buildHistory([row], units, previous, displayUnits)[0] ?? null;
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
      .select(
        `
        exercise_id,
        exercise_name,
        id,
        position,
        status,
        tracking_type,
        target_sets,
        exercise_sets (
          assistance_kg,
          entered_unit,
          id,
          planned_reps,
          position,
          reps,
          status,
          weight_kg
        ),
        training_sessions!inner ( ended_at, id, started_at, template_name )
      `,
      )
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

  const rows = [...sessions.values()];
  return (
    buildExerciseIndex(
      buildHistory(rows, units, undefined, latestEnteredUnits(rows, units)),
    ).get(exerciseId) ?? null
  );
}

/**
 * The unit each exercise was last logged in. An exercise reads in that unit
 * everywhere, so a lb machine shows its lb numbers across its whole history.
 */
function latestEnteredUnits(rows: HistoryRow[], unitSystem: UnitSystem) {
  const units = new Map<string, UnitSystem>();
  const newestFirst = [...rows].sort((left, right) =>
    (right.ended_at ?? right.started_at).localeCompare(
      left.ended_at ?? left.started_at,
    ),
  );
  for (const row of newestFirst) {
    for (const exercise of row.session_exercises) {
      if (!exercise.exercise_id || units.has(exercise.exercise_id)) continue;
      const first = exercise.exercise_sets
        .filter((set) => set.status === "completed" && set.reps !== null)
        .sort((left, right) => left.position - right.position)[0];
      if (first)
        units.set(exercise.exercise_id, first.entered_unit ?? unitSystem);
    }
  }
  return units;
}

function buildHistory(
  rows: HistoryRow[],
  unitSystem: UnitSystem,
  previousByExercise = new Map<string, PreviousPerformance>(),
  displayUnits = new Map<string, UnitSystem>(),
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
          .sort((left, right) => left.position - right.position)
          .map((set) => ({
            id: set.id,
            loadKg:
              exercise.tracking_type === "assistance_reps"
                ? set.assistance_kg
                : set.weight_kg,
            planned_reps: set.planned_reps,
            position: set.position,
            reps: set.reps!,
            unit: set.entered_unit,
          }));
        const current: PreviousPerformance | null = completed.length
          ? {
              loadKg: completed[0].loadKg,
              reps: completed.map((set) => set.reps),
              unit: completed[0].unit,
            }
          : null;
        const previous = exercise.exercise_id
          ? previousByExercise.get(exercise.exercise_id)
          : undefined;
        const displayUnit =
          (exercise.exercise_id && displayUnits.get(exercise.exercise_id)) ||
          unitSystem;
        const comparison: PerformanceComparison = previous
          ? comparePerformance(
              current,
              previous,
              exercise.tracking_type,
              displayUnit,
            )
          : current
            ? { label: "First time logged", state: "new" }
            : { label: "No completed sets", state: "new" };
        const storedPlannedSets = exercise.exercise_sets.filter(
          (set) => set.planned_reps !== null,
        ).length;
        const plannedSets = exercise.target_sets ?? storedPlannedSets;
        const plannedCompletedSets = completed.filter((set) =>
          exercise.target_sets !== null
            ? set.position < plannedSets
            : set.planned_reps !== null,
        ).length;

        if (exercise.exercise_id && current) {
          previousByExercise.set(exercise.exercise_id, current);
        }

        return {
          comparison,
          completedSets: completed.length,
          displayUnit,
          extraCompletedSets: completed.length - plannedCompletedSets,
          exerciseId: exercise.exercise_id,
          id: exercise.id,
          loadKg: current?.loadKg ?? null,
          name: exercise.exercise_name,
          plannedSets,
          plannedCompletedSets,
          reps: current?.reps ?? [],
          sets: completed.map(({ id, loadKg, position, reps, unit }) => ({
            id,
            loadKg,
            position,
            reps,
            unit,
          })),
          skippedSets: exercise.exercise_sets.filter(
            (set) => set.status === "skipped" && set.planned_reps !== null,
          ).length,
          trackingType: exercise.tracking_type,
          unit: current?.unit ?? null,
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
      templateName: row.template_name ?? "Workout",
    };
  });

  return sessions.reverse();
}

function buildExerciseIndex(sessions: HistorySession[]) {
  const timelines = new Map<string, ExerciseTimeline>();

  // Sessions arrive newest first, so each exercise's exposures do too.
  for (const session of sessions) {
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
