import type { Database } from "@/lib/supabase/database.types";

export type ExerciseTrackingType =
  Database["public"]["Enums"]["exercise_tracking_type"];

export type ExerciseCatalogItem = {
  id: string;
  isArchived?: boolean;
  isCustom: boolean;
  name: string;
  primaryMuscle?: {
    name: string;
    slug: string;
  };
  trackingType: ExerciseTrackingType;
};

export type WorkoutExerciseDraft = ExerciseCatalogItem & {
  defaultRestSeconds: number;
  targetRepMax: number;
  targetRepMin: number;
  targetSets: number;
};

export type WorkoutTemplateDraft = {
  exercises: WorkoutExerciseDraft[];
  id: string;
  name: string;
};
