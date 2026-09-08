import type { Database } from "@/lib/supabase/database.types";

export type ExerciseTrackingType =
  Database["public"]["Enums"]["exercise_tracking_type"];

export type ExerciseCatalogItem = {
  id: string;
  isCustom: boolean;
  name: string;
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
