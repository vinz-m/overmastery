"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import { closeExpiredSession, expireStaleSession } from "./expire-session";
import { isSessionExpired } from "./session-day";
import type { SessionMutationResult } from "./types";
import { canAddExtraSet } from "./set-policy";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type StartWorkoutState = {
  message?: string;
};

export async function startWorkout(
  workoutId: string,
  previousState: StartWorkoutState,
  formData: FormData,
): Promise<StartWorkoutState> {
  void previousState;
  void formData;
  if (!uuidPattern.test(workoutId)) {
    return { message: "This workout is invalid. Refresh and try again." };
  }

  const userId = await requireUserId();
  const supabase = await createClient();
  await expireStaleSession(supabase, userId);
  const { data: existing } = await supabase
    .from("training_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (existing) redirect(`/sessions/${existing.id}`);

  const { data: template, error: templateError } = await supabase
    .from("workout_templates")
    .select(
      `
      id,
      name,
      workout_template_exercises (
        default_rest_seconds,
        id,
        position,
        target_rep_max,
        target_rep_min,
        target_sets,
        exercises (
          id,
          is_unilateral,
          name,
          tracking_type
        )
      )
    `,
    )
    .eq("id", workoutId)
    .is("archived_at", null)
    .single();

  if (templateError || !template) {
    return {
      message: "This workout is no longer available. Choose another workout.",
    };
  }

  const templateExercises = [...template.workout_template_exercises].sort(
    (left, right) => left.position - right.position,
  );
  if (templateExercises.length === 0) {
    return {
      message: "Add at least one exercise before starting this workout.",
    };
  }
  if (templateExercises.some((item) => !item.exercises)) {
    return {
      message:
        "This workout has an unavailable exercise. Edit it before starting.",
    };
  }

  const { data: session, error: sessionError } = await supabase
    .from("training_sessions")
    .insert({
      source_workout_template_id: template.id,
      template_name: template.name,
      user_id: userId,
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    const { data: racedSession } = await supabase
      .from("training_sessions")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (racedSession) redirect(`/sessions/${racedSession.id}`);
    return { message: "This workout could not be started. Try again." };
  }

  const { data: sessionExercises, error: exerciseError } = await supabase
    .from("session_exercises")
    .insert(
      templateExercises.map((item) => ({
        exercise_id: item.exercises!.id,
        exercise_name: item.exercises!.name,
        is_unilateral: item.exercises!.is_unilateral,
        position: item.position,
        default_rest_seconds: item.default_rest_seconds,
        source_template_exercise_id: item.id,
        target_rep_max: item.target_rep_max,
        target_rep_min: item.target_rep_min,
        target_sets: item.target_sets,
        tracking_type: item.exercises!.tracking_type,
        training_session_id: session.id,
      })),
    )
    .select("id, source_template_exercise_id");

  if (exerciseError || !sessionExercises) {
    await supabase.from("training_sessions").delete().eq("id", session.id);
    return { message: "This workout could not be prepared. Try again." };
  }

  const exerciseByTemplateId = new Map(
    sessionExercises.map((exercise) => [
      exercise.source_template_exercise_id,
      exercise.id,
    ]),
  );
  const plannedSets = templateExercises.flatMap((item) => {
    const sessionExerciseId = exerciseByTemplateId.get(item.id);
    if (!sessionExerciseId) return [];

    return Array.from({ length: item.target_sets }, (_, position) => ({
      planned_reps: item.target_rep_max,
      position,
      session_exercise_id: sessionExerciseId,
    }));
  });
  const { error: setError } = await supabase
    .from("exercise_sets")
    .insert(plannedSets);

  if (setError) {
    await supabase.from("training_sessions").delete().eq("id", session.id);
    return { message: "This workout could not be prepared. Try again." };
  }

  revalidatePath("/");
  redirect(`/sessions/${session.id}`);
}

export async function completeSet(input: {
  loadKg: number | null;
  loadUnit: "imperial" | "metric" | null;
  reps: number;
  sessionId: string;
  setId: string;
}): Promise<SessionMutationResult> {
  if (
    !validSessionInput(input.sessionId, input.setId) ||
    !Number.isInteger(input.reps) ||
    input.reps < 0 ||
    input.reps > 1000 ||
    (input.loadUnit !== null &&
      input.loadUnit !== "metric" &&
      input.loadUnit !== "imperial")
  ) {
    return failure("Enter a valid set.");
  }

  await requireUserId();
  const supabase = await createClient();
  const { data: set } = await supabase
    .from("exercise_sets")
    .select(
      `
      id,
      session_exercise_id,
      session_exercises (
        tracking_type,
        training_session_id,
        training_sessions ( started_at, status )
      )
    `,
    )
    .eq("id", input.setId)
    .single();

  const exercise = set?.session_exercises;
  if (
    !set ||
    !exercise ||
    exercise.training_session_id !== input.sessionId ||
    exercise.training_sessions?.status !== "active"
  ) {
    return failure("This workout is no longer active.");
  }
  if (isSessionExpired(exercise.training_sessions.started_at)) {
    await closeExpiredSession(
      supabase,
      input.sessionId,
      exercise.training_sessions.started_at,
    );
    return failure(
      "This workout was closed automatically after 6 hours. Start a new one to keep logging.",
    );
  }

  const trackingType = exercise.tracking_type;
  // Added weight on a bodyweight exercise is optional; everything else needs a load.
  const loadOptional = trackingType === "bodyweight_reps";
  if (
    input.loadKg === null
      ? !loadOptional
      : !Number.isFinite(input.loadKg) ||
        input.loadKg < 0 ||
        input.loadKg > 10000
  ) {
    return failure("Enter a valid load.");
  }
  const loadKg = loadOptional && input.loadKg === 0 ? null : input.loadKg;

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("exercise_sets")
    .update({
      assistance_kg: trackingType === "assistance_reps" ? loadKg : null,
      completed_at: now,
      entered_unit: loadKg === null ? null : input.loadUnit,
      reps: input.reps,
      status: "completed",
      weight_kg: trackingType === "assistance_reps" ? null : loadKg,
    })
    .eq("id", set.id);

  if (error) return failure("The set could not be saved. Try again.");
  return succeeded();
}

export async function reopenSet(input: {
  sessionId: string;
  setId: string;
}): Promise<SessionMutationResult> {
  if (!validSessionInput(input.sessionId, input.setId)) {
    return failure("This set could not be edited.");
  }

  await requireUserId();
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("exercise_sets")
    .select(
      "id, session_exercise_id, session_exercises ( training_session_id, training_sessions ( status ) )",
    )
    .eq("id", input.setId)
    .single();
  if (
    !existing ||
    existing.session_exercises?.training_session_id !== input.sessionId ||
    existing.session_exercises.training_sessions?.status !== "active"
  ) {
    return failure("This workout is no longer active.");
  }

  const { data: set, error } = await supabase
    .from("exercise_sets")
    .update({ completed_at: null, status: "planned" })
    .eq("id", input.setId)
    .eq("status", "completed")
    .select("session_exercise_id")
    .single();

  if (error || !set) return failure("This set could not be edited.");
  return succeeded();
}

export async function addExtraSet(input: {
  sessionExerciseId: string;
  sessionId: string;
}): Promise<SessionMutationResult> {
  if (!validSessionInput(input.sessionExerciseId, input.sessionId)) {
    return failure("A set could not be added.");
  }

  await requireUserId();
  const supabase = await createClient();
  const { data: exercise } = await supabase
    .from("session_exercises")
    .select(
      `
      id,
      training_session_id,
      training_sessions ( status ),
      target_sets,
      exercise_sets ( planned_reps, position, status )
    `,
    )
    .eq("id", input.sessionExerciseId)
    .single();

  if (
    !exercise ||
    exercise.training_session_id !== input.sessionId ||
    exercise.training_sessions?.status !== "active"
  ) {
    return failure("This workout is no longer active.");
  }

  const sourceTarget = exercise.target_sets;
  const canAdd = canAddExtraSet(
    exercise.exercise_sets.map((set) => ({
      isPlanned:
        sourceTarget !== undefined && sourceTarget !== null
          ? set.position < sourceTarget
          : set.planned_reps !== null,
      status: set.status,
    })),
  );
  if (!canAdd) {
    return failure("Complete the open extra set before adding another.");
  }

  const nextPosition =
    Math.max(-1, ...exercise.exercise_sets.map((set) => set.position)) + 1;
  const { error } = await supabase.from("exercise_sets").insert({
    planned_reps: null,
    position: nextPosition,
    session_exercise_id: exercise.id,
  });

  if (error) return failure("A set could not be added. Try again.");
  return succeeded();
}

export async function removeWorkingSet(input: {
  sessionId: string;
  setId: string;
}): Promise<SessionMutationResult> {
  if (!validSessionInput(input.sessionId, input.setId)) {
    return failure("This set could not be removed.");
  }

  await requireUserId();
  const supabase = await createClient();
  const { data: set } = await supabase
    .from("exercise_sets")
    .select(
      "id, planned_reps, position, status, session_exercise_id, session_exercises ( training_session_id, target_sets, training_sessions ( status ), exercise_sets ( id, status ) )",
    )
    .eq("id", input.setId)
    .single();

  if (
    !set ||
    set.status !== "planned" ||
    set.session_exercises?.training_session_id !== input.sessionId ||
    set.session_exercises.training_sessions?.status !== "active" ||
    (set.session_exercises?.exercise_sets.filter(
      (exerciseSet) => exerciseSet.status !== "skipped",
    ).length ?? 0) <= 1
  ) {
    return failure("Keep at least one working set.");
  }

  const sourceTarget = set.session_exercises.target_sets;
  const isPlanned =
    sourceTarget !== undefined && sourceTarget !== null
      ? set.position < sourceTarget
      : set.planned_reps !== null;
  const { error } = isPlanned
    ? await supabase
        .from("exercise_sets")
        .update({
          assistance_kg: null,
          completed_at: null,
          distance_meters: null,
          duration_seconds: null,
          reps: null,
          status: "skipped",
          weight_kg: null,
        })
        .eq("id", set.id)
    : await supabase.from("exercise_sets").delete().eq("id", set.id);
  if (error) {
    return failure(
      isPlanned
        ? "This planned set could not be skipped."
        : "This extra set could not be removed.",
    );
  }

  return succeeded();
}

export async function restoreSkippedSet(input: {
  sessionId: string;
  setId: string;
}): Promise<SessionMutationResult> {
  if (!validSessionInput(input.sessionId, input.setId)) {
    return failure("This planned set could not be restored.");
  }

  await requireUserId();
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("exercise_sets")
    .select(
      "id, session_exercise_id, status, session_exercises ( training_session_id, training_sessions ( status ) )",
    )
    .eq("id", input.setId)
    .single();
  if (
    !existing ||
    existing.status !== "skipped" ||
    existing.session_exercises?.training_session_id !== input.sessionId ||
    existing.session_exercises.training_sessions?.status !== "active"
  ) {
    return failure("This planned set could not be restored.");
  }

  const { error } = await supabase
    .from("exercise_sets")
    .update({ status: "planned" })
    .eq("id", existing.id)
    .eq("status", "skipped");
  if (error) return failure("This planned set could not be restored.");

  return succeeded();
}

export async function restoreMissingPlannedSet(input: {
  position: number;
  sessionExerciseId: string;
  sessionId: string;
}): Promise<SessionMutationResult> {
  if (
    !validSessionInput(input.sessionExerciseId, input.sessionId) ||
    !Number.isInteger(input.position) ||
    input.position < 0
  ) {
    return failure("This planned set could not be restored.");
  }

  await requireUserId();
  const supabase = await createClient();
  const { data: exercise } = await supabase
    .from("session_exercises")
    .select(
      "id, training_session_id, training_sessions ( status ), target_rep_max, target_sets, exercise_sets ( position )",
    )
    .eq("id", input.sessionExerciseId)
    .single();
  const source =
    exercise && exercise.target_sets !== null
      ? {
          target_rep_max: exercise.target_rep_max,
          target_sets: exercise.target_sets,
        }
      : null;
  if (
    !exercise ||
    !source ||
    exercise.training_session_id !== input.sessionId ||
    exercise.training_sessions?.status !== "active" ||
    input.position >= source.target_sets ||
    exercise.exercise_sets.some((set) => set.position === input.position)
  ) {
    return failure("This planned set could not be restored.");
  }

  const { error } = await supabase.from("exercise_sets").insert({
    planned_reps: source.target_rep_max,
    position: input.position,
    session_exercise_id: exercise.id,
  });
  if (error) return failure("This planned set could not be restored.");

  return succeeded();
}

export async function skipExercise(input: {
  sessionExerciseId: string;
  sessionId: string;
}): Promise<SessionMutationResult> {
  if (!validSessionInput(input.sessionExerciseId, input.sessionId)) {
    return failure("This exercise could not be skipped.");
  }

  await requireUserId();
  const supabase = await createClient();
  const { data: exercise } = await supabase
    .from("session_exercises")
    .select(
      "id, training_session_id, training_sessions ( status ), exercise_sets ( id, status )",
    )
    .eq("id", input.sessionExerciseId)
    .single();

  if (
    !exercise ||
    exercise.training_session_id !== input.sessionId ||
    exercise.training_sessions?.status !== "active" ||
    exercise.exercise_sets.some((set) => set.status === "completed")
  ) {
    return failure("An exercise with completed sets cannot be skipped.");
  }

  const { error: setsError } = await supabase
    .from("exercise_sets")
    .update({ status: "skipped" })
    .eq("session_exercise_id", exercise.id);
  if (setsError) return failure("This exercise could not be skipped.");

  const { error } = await supabase
    .from("session_exercises")
    .update({ status: "skipped" })
    .eq("id", exercise.id);

  return error
    ? failure("This exercise could not be skipped. Try again.")
    : succeeded();
}

export async function swapExercise(input: {
  replacementExerciseId: string;
  sessionExerciseId: string;
  sessionId: string;
}): Promise<SessionMutationResult> {
  if (
    !validSessionInput(
      input.replacementExerciseId,
      input.sessionExerciseId,
      input.sessionId,
    )
  ) {
    return failure("Choose a valid replacement.");
  }

  await requireUserId();
  const supabase = await createClient();
  const [{ data: current }, { data: replacement }] = await Promise.all([
    supabase
      .from("session_exercises")
      .select(
        "id, training_session_id, training_sessions ( status ), exercise_sets ( id, status )",
      )
      .eq("id", input.sessionExerciseId)
      .eq("training_session_id", input.sessionId)
      .single(),
    supabase
      .from("exercises")
      .select("id, is_unilateral, name, tracking_type")
      .eq("id", input.replacementExerciseId)
      .is("archived_at", null)
      .single(),
  ]);

  if (
    !current ||
    !replacement ||
    current.training_session_id !== input.sessionId ||
    current.training_sessions?.status !== "active"
  ) {
    return failure("This workout is no longer active.");
  }
  if (current.exercise_sets.some((set) => set.status === "completed")) {
    return failure("Swap this exercise before logging a set.");
  }

  const { error: updateError } = await supabase
    .from("session_exercises")
    .update({
      exercise_id: replacement.id,
      exercise_name: replacement.name,
      is_unilateral: replacement.is_unilateral,
      status: "planned",
      tracking_type: replacement.tracking_type,
    })
    .eq("id", current.id);
  if (updateError) return failure("The exercise could not be swapped.");
  return succeeded();
}

export async function finishSession(
  sessionId: string,
): Promise<SessionMutationResult> {
  if (!uuidPattern.test(sessionId)) return failure("This workout is invalid.");

  await requireUserId();
  const supabase = await createClient();
  // One transaction: open sets are skipped, exercises settled, session closed.
  const { data: outcome, error } = await supabase.rpc("finish_session", {
    p_session_id: sessionId,
  });

  if (error) return failure("The workout could not be finished. Try again.");
  if (outcome === "not_active")
    return failure("This workout is no longer active.");
  if (outcome === "no_sets")
    return failure("Complete at least one set before finishing.");

  revalidatePath("/", "layout");
  redirect(`/sessions/${sessionId}/summary`);
}

export type DiscardSessionState = {
  message?: string;
};

// A workout with nothing logged was most likely started by accident, so it is
// deleted outright (its exercises and sets cascade). Once sets are logged it is
// closed as abandoned instead, like the day-boundary expiry, so the data isn't
// lost but never reaches history, progress, or previous-performance prefill.
export async function discardSession(
  sessionId: string,
  previousState: DiscardSessionState,
  formData: FormData,
): Promise<DiscardSessionState> {
  void previousState;
  void formData;
  if (!uuidPattern.test(sessionId))
    return { message: "This workout is invalid." };

  const userId = await requireUserId();
  const supabase = await createClient();
  const { data: session } = await supabase
    .from("training_sessions")
    .select("id, session_exercises ( exercise_sets ( status ) )")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (!session) return { message: "This workout is no longer active." };

  const hasLoggedSets = session.session_exercises.some((exercise) =>
    exercise.exercise_sets.some((set) => set.status === "completed"),
  );
  const { error } = hasLoggedSets
    ? await supabase
        .from("training_sessions")
        .update({ ended_at: new Date().toISOString(), status: "abandoned" })
        .eq("id", session.id)
        .eq("status", "active")
    : await supabase
        .from("training_sessions")
        .delete()
        .eq("id", session.id)
        .eq("status", "active");

  if (error)
    return { message: "The workout could not be discarded. Try again." };

  revalidatePath("/", "layout");
  redirect("/");
}

function validSessionInput(...values: string[]) {
  return values.every((value) => uuidPattern.test(value));
}

// Re-renders the current route inside this action's response, so the client
// gets fresh data without a second request. Also purges the client cache so
// other tabs don't show stale session state.
function succeeded(): SessionMutationResult {
  revalidatePath("/", "layout");
  return { ok: true };
}

function failure(message: string): SessionMutationResult {
  return { message, ok: false };
}
