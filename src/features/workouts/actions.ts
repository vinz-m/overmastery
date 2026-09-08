"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { updateGuidanceMetadata } from "@/features/guidance/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import type {
  ExerciseCatalogItem,
  ExerciseTrackingType,
} from "./types";
import { isWorkoutId, readWorkoutDraft } from "./workout-draft";

export type CreateWorkoutState = {
  fieldErrors?: {
    exercises?: string;
    name?: string;
  };
  message?: string;
};

export type CreateExerciseState = {
  exercise?: ExerciseCatalogItem;
  message?: string;
};

const supportedTrackingTypes = new Set<ExerciseTrackingType>([
  "weight_reps",
  "bodyweight_reps",
  "added_weight_reps",
  "assistance_reps",
]);

export async function createWorkout(
  _previousState: CreateWorkoutState,
  formData: FormData,
): Promise<CreateWorkoutState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const exercises = readWorkoutDraft(formData.get("exercises"));
  const fieldErrors: CreateWorkoutState["fieldErrors"] = {};

  if (name.length < 2 || name.length > 120) {
    fieldErrors.name = "Use between 2 and 120 characters.";
  }

  if (!exercises) {
    fieldErrors.exercises = "Add at least one valid exercise.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const supabase = await createClient();
  const { data: workout, error: workoutError } = await supabase
    .from("workout_templates")
    .insert({ name, user_id: user.id })
    .select("id")
    .single();

  if (workoutError || !workout) {
    return {
      message:
        workoutError?.code === "23505"
          ? "You already have a workout with that name."
          : "The workout could not be saved. Try again.",
    };
  }

  const { error: exercisesError } = await supabase
    .from("workout_template_exercises")
    .insert(
      exercises!.map((exercise, position) => ({
        default_rest_seconds: exercise.defaultRestSeconds,
        exercise_id: exercise.id,
        position,
        target_rep_max: exercise.targetRepMax,
        target_rep_min: exercise.targetRepMin,
        target_sets: exercise.targetSets,
        workout_template_id: workout.id,
      })),
    );

  if (exercisesError) {
    await supabase.from("workout_templates").delete().eq("id", workout.id);
    return { message: "The exercises could not be saved. Try again." };
  }

  await updateGuidanceMetadata(
    [
      "home.create-workout.v1",
      "workout-builder.add-exercise.v1",
      "workout-builder.configure-exercise.v1",
      "workout-builder.save-workout.v1",
    ],
    "completed",
    supabase,
  );

  revalidatePath("/");
  revalidatePath("/workouts");
  redirect("/workouts");
}

export async function updateWorkout(
  workoutId: string,
  _previousState: CreateWorkoutState,
  formData: FormData,
): Promise<CreateWorkoutState> {
  if (!isWorkoutId(workoutId)) return { message: "This workout could not be saved." };

  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const exercises = readWorkoutDraft(formData.get("exercises"));
  const fieldErrors: CreateWorkoutState["fieldErrors"] = {};
  if (name.length < 2 || name.length > 120) fieldErrors.name = "Use between 2 and 120 characters.";
  if (!exercises) fieldErrors.exercises = "Add at least one valid exercise.";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await createClient();
  const { data: workout, error: lookupError } = await supabase
    .from("workout_templates")
    .select(`
      id,
      name,
      workout_template_exercises (
        default_rest_seconds,
        exercise_id,
        position,
        target_rep_max,
        target_rep_min,
        target_sets
      )
    `)
    .eq("id", workoutId)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .maybeSingle();
  if (lookupError || !workout) return { message: "This workout is no longer available." };

  const { error: nameError } = await supabase
    .from("workout_templates")
    .update({ name })
    .eq("id", workout.id);
  if (nameError) {
    return { message: nameError.code === "23505" ? "You already have a workout with that name." : "The workout could not be saved. Try again." };
  }

  const { error: removeError } = await supabase
    .from("workout_template_exercises")
    .delete()
    .eq("workout_template_id", workout.id);
  if (removeError) return { message: "The workout exercises could not be updated. Try again." };

  const { error: insertError } = await supabase
    .from("workout_template_exercises")
    .insert(exercises!.map((exercise, position) => ({
      default_rest_seconds: exercise.defaultRestSeconds,
      exercise_id: exercise.id,
      position,
      target_rep_max: exercise.targetRepMax,
      target_rep_min: exercise.targetRepMin,
      target_sets: exercise.targetSets,
      workout_template_id: workout.id,
    })));
  if (insertError) {
    const previousExercises = workout.workout_template_exercises.map((exercise) => ({
      default_rest_seconds: exercise.default_rest_seconds,
      exercise_id: exercise.exercise_id,
      position: exercise.position,
      target_rep_max: exercise.target_rep_max,
      target_rep_min: exercise.target_rep_min,
      target_sets: exercise.target_sets,
      workout_template_id: workout.id,
    }));
    if (previousExercises.length > 0) {
      await supabase.from("workout_template_exercises").insert(previousExercises);
    }
    await supabase.from("workout_templates").update({ name: workout.name }).eq("id", workout.id);
    return { message: "The workout exercises could not be updated. Your previous plan was kept; try again." };
  }

  revalidatePath("/");
  revalidatePath("/workouts");
  redirect("/workouts");
}

export async function archiveWorkout(workoutId: string, formData: FormData) {
  void formData;
  if (!isWorkoutId(workoutId)) redirect("/workouts");
  const user = await requireUser();
  const supabase = await createClient();
  await supabase
    .from("workout_templates")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", workoutId)
    .eq("user_id", user.id)
    .is("archived_at", null);
  revalidatePath("/");
  revalidatePath("/workouts");
  redirect("/workouts");
}

export async function createCustomExercise(
  _previousState: CreateExerciseState,
  formData: FormData,
): Promise<CreateExerciseState> {
  const user = await requireUser();
  const name = String(formData.get("customExerciseName") ?? "").trim();
  const trackingType = String(
    formData.get("trackingType") ?? "weight_reps",
  ) as ExerciseTrackingType;

  if (name.length < 2 || name.length > 120) {
    return { message: "Use between 2 and 120 characters." };
  }

  if (!supportedTrackingTypes.has(trackingType)) {
    return { message: "Choose a supported tracking type." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .insert({ name, owner_user_id: user.id, tracking_type: trackingType })
    .select("id, name, tracking_type")
    .single();

  if (error || !data) {
    return {
      message:
        error?.code === "23505"
          ? "You already have an exercise with that name."
          : "The exercise could not be created. Try again.",
    };
  }

  return {
    exercise: {
      id: data.id,
      isCustom: true,
      name: data.name,
      trackingType: data.tracking_type,
    },
  };
}
