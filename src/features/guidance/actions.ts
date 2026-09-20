"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { updateGuidanceMetadata } from "./server";
import type { GuidanceKey, GuidanceOutcome } from "./model";

export async function recordGuidance(
  key: GuidanceKey,
  outcome: GuidanceOutcome,
) {
  const saved = await updateGuidanceMetadata([key], outcome);
  if (saved) revalidatePath("/", "layout");
  return saved;
}

export async function beginWorkoutCreation() {
  await updateGuidanceMetadata(["home.overview.v1"], "completed");
  redirect("/workouts/new");
}
