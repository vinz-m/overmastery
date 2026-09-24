import type { Database } from "@/lib/supabase/database.types";
import type { ExerciseCatalogItem } from "@/features/workouts/types";
import type { UnitSystem } from "@/lib/units";

export type TrackingType =
  Database["public"]["Enums"]["exercise_tracking_type"];

export type ActiveSet = {
  /** Unit the load was typed in; null means the profile default. */
  enteredUnit: UnitSystem | null;
  id: string;
  isPlanned: boolean;
  loadKg: number | null;
  plannedReps: number | null;
  position: number;
  reps: number | null;
  status: Database["public"]["Enums"]["set_status"];
};

export type PreviousPerformance = {
  loadKg: number | null;
  reps: number[];
  /** Unit the load was entered in, when known. */
  unit?: UnitSystem | null;
};

export type ActiveExercise = {
  defaultRestSeconds: number | null;
  exerciseId: string;
  id: string;
  name: string;
  position: number;
  previous: PreviousPerformance;
  sets: ActiveSet[];
  status: Database["public"]["Enums"]["session_exercise_status"];
  targetSets: number;
  targetRepMax: number | null;
  targetRepMin: number | null;
  trackingType: TrackingType;
};

export type ActiveSession = {
  exercises: ActiveExercise[];
  id: string;
  startedAt: string;
  templateName: string;
};

export type SwapExerciseOption = ExerciseCatalogItem;

export type SessionMutationResult = {
  message?: string;
  ok: boolean;
};
