import type { Database } from "@/lib/supabase/database.types";

export type TrackingType =
  Database["public"]["Enums"]["exercise_tracking_type"];

export type ActiveSet = {
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

export type SwapExerciseOption = {
  id: string;
  name: string;
  trackingType: TrackingType;
};

export type SessionMutationResult = {
  message?: string;
  ok: boolean;
};
