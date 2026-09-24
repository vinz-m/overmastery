import type { PerformanceComparison } from "@/features/sessions/performance";
import type { TrackingType } from "@/features/sessions/types";
import type { UnitSystem } from "@/lib/units";

export type HistoryExercise = {
  comparison: PerformanceComparison;
  completedSets: number;
  extraCompletedSets: number;
  exerciseId: string | null;
  id: string;
  loadKg: number | null;
  name: string;
  plannedSets: number;
  plannedCompletedSets: number;
  reps: number[];
  skippedSets: number;
  trackingType: TrackingType;
  /** Unit the load was entered in; null means the profile default. */
  unit: UnitSystem | null;
};

export type HistorySession = {
  completedSets: number;
  endedAt: string;
  exercises: HistoryExercise[];
  id: string;
  improvedExercises: number;
  startedAt: string;
  templateName: string;
};

export type ExerciseTimeline = {
  exerciseId: string;
  exposures: Array<HistoryExercise & {
    endedAt: string;
    sessionId: string;
    templateName: string;
  }>;
  name: string;
  trackingType: TrackingType;
};
