"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { updateGuidanceMetadata } from "./server";
import type { GuidanceKey, GuidanceOutcome } from "./model";

export async function recordGuidance(
  key: GuidanceKey,
  outcome: GuidanceOutcome,
) {
  await updateGuidanceMetadata([key], outcome);
}

export async function beginWorkoutCreation() {
  await updateGuidanceMetadata(["home.create-workout.v1"], "completed");
  redirect("/workouts/new");
}

export async function dismissHomeWorkoutGuidance() {
  await updateGuidanceMetadata(["home.create-workout.v1"], "dismissed");
  revalidatePath("/");
}
