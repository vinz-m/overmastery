"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import { expirePreviousDaySession } from "./expire-session";
import type { SessionMutationResult } from "./types";
import { canAddExtraSet, exerciseStatusAfterSetChange } from "./set-policy";

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

  const user = await requireUser();
  const supabase = await createClient();
  await expirePreviousDaySession(supabase, user.id, user.timeZone);
  const { data: existing } = await supabase
    .from("training_sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (existing) redirect(`/sessions/${existing.id}`);

  const { data: template, error: templateError } = await supabase
    .from("workout_templates")
    .select(`
      id,
      name,
      workout_template_exercises (
        default_rest_seconds,
        id,
        position,
        target_rep_max,
        target_sets,
        exercises (
          id,
          is_unilateral,
          name,
          tracking_type
        )
      )
    `)
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
      user_id: user.id,
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    const { data: racedSession } = await supabase
      .from("training_sessions")
      .select("id")
      .eq("user_id", user.id)
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
        source_template_exercise_id: item.id,
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
  reps: number;
  sessionId: string;
  setId: string;
}): Promise<SessionMutationResult> {
  if (
    !validSessionInput(input.sessionId, input.setId) ||
    !Number.isInteger(input.reps) ||
    input.reps < 0 ||
    input.reps > 1000
  ) {
    return failure("Enter a valid set.");
  }

  await requireUser();
  const supabase = await createClient();
  const { data: set } = await supabase
    .from("exercise_sets")
    .select(`
      id,
      session_exercise_id,
      session_exercises (
        tracking_type,
        training_session_id,
        training_sessions ( status )
      )
    `)
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

  const trackingType = exercise.tracking_type;
  const loadRequired = trackingType !== "bodyweight_reps";
  if (
    loadRequired &&
    (input.loadKg === null ||
      !Number.isFinite(input.loadKg) ||
      input.loadKg < 0 ||
      input.loadKg > 10000)
  ) {
    return failure("Enter a valid load.");
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("exercise_sets")
    .update({
      assistance_kg:
        trackingType === "assistance_reps" ? input.loadKg : null,
      completed_at: now,
      reps: input.reps,
      status: "completed",
      weight_kg:
        trackingType === "bodyweight_reps" ||
        trackingType === "assistance_reps"
          ? null
          : input.loadKg,
    })
    .eq("id", set.id);

  if (error) return failure("The set could not be saved. Try again.");
  await syncExerciseStatus(supabase, set.session_exercise_id);
  return { ok: true };
}

export async function reopenSet(input: {
  sessionId: string;
  setId: string;
}): Promise<SessionMutationResult> {
  if (!validSessionInput(input.sessionId, input.setId)) {
    return failure("This set could not be edited.");
  }

  await requireUser();
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("exercise_sets")
    .select("id, session_exercise_id, session_exercises ( training_session_id, training_sessions ( status ) )")
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
  await syncExerciseStatus(supabase, set.session_exercise_id);
  return { ok: true };
}

export async function addExtraSet(input: {
  sessionExerciseId: string;
  sessionId: string;
}): Promise<SessionMutationResult> {
  if (!validSessionInput(input.sessionExerciseId, input.sessionId)) {
    return failure("A set could not be added.");
  }

  await requireUser();
  const supabase = await createClient();
  const { data: exercise } = await supabase
    .from("session_exercises")
    .select(`
      id,
      training_session_id,
      training_sessions ( status ),
      workout_template_exercises ( target_sets ),
      exercise_sets ( planned_reps, position, status )
    `)
    .eq("id", input.sessionExerciseId)
    .single();

  if (
    !exercise ||
    exercise.training_session_id !== input.sessionId ||
    exercise.training_sessions?.status !== "active"
  ) {
    return failure("This workout is no longer active.");
  }

  const sourceTarget = exercise.workout_template_exercises?.target_sets;
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
  await supabase
    .from("session_exercises")
    .update({ status: "planned" })
    .eq("id", exercise.id);
  return { ok: true };
}

export async function removeWorkingSet(input: {
  sessionId: string;
  setId: string;
}): Promise<SessionMutationResult> {
  if (!validSessionInput(input.sessionId, input.setId)) {
    return failure("This set could not be removed.");
  }

  await requireUser();
  const supabase = await createClient();
  const { data: set } = await supabase
    .from("exercise_sets")
    .select("id, planned_reps, position, status, session_exercise_id, session_exercises ( training_session_id, training_sessions ( status ), workout_template_exercises ( target_sets ), exercise_sets ( id, status ) )")
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

  const sourceTarget =
    set.session_exercises.workout_template_exercises?.target_sets;
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

  await syncExerciseStatus(supabase, set.session_exercise_id);
  return { ok: true };
}

export async function restoreSkippedSet(input: {
  sessionId: string;
  setId: string;
}): Promise<SessionMutationResult> {
  if (!validSessionInput(input.sessionId, input.setId)) {
    return failure("This planned set could not be restored.");
  }

  await requireUser();
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("exercise_sets")
    .select("id, session_exercise_id, status, session_exercises ( training_session_id, training_sessions ( status ) )")
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

  await syncExerciseStatus(supabase, existing.session_exercise_id);
  return { ok: true };
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

  await requireUser();
  const supabase = await createClient();
  const { data: exercise } = await supabase
    .from("session_exercises")
    .select("id, training_session_id, training_sessions ( status ), workout_template_exercises ( target_rep_max, target_sets ), exercise_sets ( position )")
    .eq("id", input.sessionExerciseId)
    .single();
  const source = exercise?.workout_template_exercises;
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

  await syncExerciseStatus(supabase, exercise.id);
  return { ok: true };
}

export async function skipExercise(input: {
  sessionExerciseId: string;
  sessionId: string;
}): Promise<SessionMutationResult> {
  if (!validSessionInput(input.sessionExerciseId, input.sessionId)) {
    return failure("This exercise could not be skipped.");
  }

  await requireUser();
  const supabase = await createClient();
  const { data: exercise } = await supabase
    .from("session_exercises")
    .select("id, training_session_id, training_sessions ( status ), exercise_sets ( id, status )")
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

  await supabase
    .from("exercise_sets")
    .update({ status: "skipped" })
    .eq("session_exercise_id", exercise.id);
  const { error } = await supabase
    .from("session_exercises")
    .update({ status: "skipped" })
    .eq("id", exercise.id);

  return error
    ? failure("This exercise could not be skipped.")
    : { ok: true };
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

  await requireUser();
  const supabase = await createClient();
  const [{ data: current }, { data: replacement }] = await Promise.all([
    supabase
      .from("session_exercises")
      .select("id, training_session_id, training_sessions ( status ), exercise_sets ( id, status )")
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
  return { ok: true };
}

export async function finishSession(
  sessionId: string,
): Promise<SessionMutationResult> {
  if (!uuidPattern.test(sessionId)) return failure("This workout is invalid.");

  const user = await requireUser();
  const supabase = await createClient();
  const { data: session } = await supabase
    .from("training_sessions")
    .select("id, session_exercises ( id, exercise_sets ( id, status ) )")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!session) return failure("This workout is no longer active.");

  const completedSetCount = session.session_exercises.reduce(
    (count, exercise) =>
      count +
      exercise.exercise_sets.filter((set) => set.status === "completed").length,
    0,
  );
  if (completedSetCount === 0) {
    return failure("Complete at least one set before finishing.");
  }

  for (const exercise of session.session_exercises) {
    const performed = exercise.exercise_sets.some(
      (set) => set.status === "completed",
    );
    await supabase
      .from("exercise_sets")
      .update({ status: "skipped" })
      .eq("session_exercise_id", exercise.id)
      .eq("status", "planned");
    await supabase
      .from("session_exercises")
      .update({ status: performed ? "completed" : "skipped" })
      .eq("id", exercise.id);
  }

  const { error } = await supabase
    .from("training_sessions")
    .update({ ended_at: new Date().toISOString(), status: "completed" })
    .eq("id", session.id);
  if (error) return failure("The workout could not be finished. Try again.");

  revalidatePath("/");
  redirect(`/sessions/${session.id}/summary`);
}

async function syncExerciseStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionExerciseId: string,
) {
  const { data } = await supabase
    .from("exercise_sets")
    .select("status")
    .eq("session_exercise_id", sessionExerciseId);
  const sets = data ?? [];
  const status = exerciseStatusAfterSetChange(
    sets.map((set) => set.status),
  );

  await supabase
    .from("session_exercises")
    .update({ status })
    .eq("id", sessionExerciseId);
}

function validSessionInput(...values: string[]) {
  return values.every((value) => uuidPattern.test(value));
}

function failure(message: string): SessionMutationResult {
  return { message, ok: false };
}
