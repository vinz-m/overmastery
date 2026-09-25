import "server-only";

import { requireUserId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import { closeExpiredSession, lastSetAt } from "./expire-session";
import { isSessionExpired, lastActivityAt } from "./session-day";
import type { CompleteSetInput, SessionMutationResult } from "./types";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Saves a completed set. Called through a route handler rather than a server
 * action: Next runs server actions one at a time, so a request hanging on a
 * weak signal would hold up every set queued behind it.
 *
 * A set logged offline can arrive hours later, after the workout went idle
 * and was closed. It's judged by when it was logged (`completedAt`), so a set
 * done during the workout is still saved, even into the completed session.
 */
export async function saveCompletedSet(
  input: CompleteSetInput,
): Promise<SessionMutationResult> {
  if (
    typeof input !== "object" ||
    input === null ||
    !uuidPattern.test(input.sessionId) ||
    !uuidPattern.test(input.setId) ||
    !Number.isInteger(input.reps) ||
    input.reps < 0 ||
    input.reps > 1000 ||
    (input.loadUnit !== null &&
      input.loadUnit !== "metric" &&
      input.loadUnit !== "imperial") ||
    (input.completedAt !== undefined &&
      !Number.isFinite(Date.parse(input.completedAt)))
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
        training_sessions (
          ended_at,
          started_at,
          status,
          session_exercises ( exercise_sets ( id, completed_at ) )
        )
      )
    `,
    )
    .eq("id", input.setId)
    .single();

  const exercise = set?.session_exercises;
  const session = exercise?.training_sessions;
  if (
    !set ||
    !exercise ||
    !session ||
    exercise.training_session_id !== input.sessionId ||
    session.status === "abandoned"
  ) {
    return failure("This workout is no longer active.");
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

  // The device's time can drift, so keep it within the session and not ahead of now.
  const now = new Date();
  const loggedAt = new Date(
    Math.min(
      now.getTime(),
      Math.max(
        Date.parse(session.started_at),
        input.completedAt ? Date.parse(input.completedAt) : now.getTime(),
      ),
    ),
  );
  const otherCompletedAts = session.session_exercises.flatMap((item) =>
    item.exercise_sets
      .filter((other) => other.id !== set.id)
      .map((other) => other.completed_at),
  );
  if (
    isSessionExpired(
      lastActivityAt(session.started_at, otherCompletedAts),
      loggedAt,
    )
  ) {
    // The workout had already gone idle when this set was logged.
    if (session.status === "active")
      await closeExpiredSession(
        supabase,
        input.sessionId,
        lastSetAt(otherCompletedAts),
      );
    return failure(
      session.status === "active"
        ? "This workout was closed after 4 hours without a logged set. Start a new one to keep logging."
        : "This workout was already finished.",
    );
  }

  const { error } = await supabase
    .from("exercise_sets")
    .update({
      assistance_kg: trackingType === "assistance_reps" ? loadKg : null,
      completed_at: loggedAt.toISOString(),
      entered_unit: loadKg === null ? null : input.loadUnit,
      reps: input.reps,
      status: "completed",
      weight_kg: trackingType === "assistance_reps" ? null : loadKg,
    })
    .eq("id", set.id);
  if (error) return failure("The set could not be saved. Try again.");

  const lastSet = lastSetAt([...otherCompletedAts, loggedAt.toISOString()])!;
  if (session.status === "completed") {
    // A late set from the workout: the session now ends at it if it's the latest.
    if (session.ended_at && Date.parse(lastSet) > Date.parse(session.ended_at))
      await supabase
        .from("training_sessions")
        .update({ ended_at: lastSet })
        .eq("id", input.sessionId)
        .eq("status", "completed");
  } else if (isSessionExpired(lastSet, now)) {
    // Synced after the workout went idle: close it now, ending at its last set.
    // Any other sets still queued are accepted into the completed session.
    await closeExpiredSession(supabase, input.sessionId, lastSet);
  }
  return { ok: true };
}

function failure(message: string): SessionMutationResult {
  return { message, ok: false };
}
