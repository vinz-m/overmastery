import type { PerformanceComparison } from "@/features/sessions/performance";
import type {
  PreviousPerformance,
  TrackingType,
} from "@/features/sessions/types";
import type { UnitSystem } from "@/lib/units";

/** A completed set as recorded, which can still be corrected afterwards. */
export type HistorySet = {
  id: string;
  loadKg: number | null;
  position: number;
  reps: number;
  /** Unit the load was entered in; null means the profile default. */
  unit: UnitSystem | null;
};

export type HistoryExercise = {
  comparison: PerformanceComparison;
  completedSets: number;
  /** The unit this exercise was last logged in, which it reads in everywhere. */
  displayUnit: UnitSystem;
  extraCompletedSets: number;
  exerciseId: string | null;
  id: string;
  loadKg: number | null;
  name: string;
  plannedSets: number;
  plannedCompletedSets: number;
  reps: number[];
  sets: HistorySet[];
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

/** A finished workout as it appears in a list. */
export type WorkoutListItem = {
  completedSets: number;
  /** Exercises with at least one completed set. */
  doneExercises: number;
  endedAt: string;
  id: string;
  improvedExercises: number;
  templateName: string;
};

export type WorkoutHistoryPage = {
  /** Pass back to load the next, older page; null once everything is shown. */
  nextCursor: string | null;
  workouts: WorkoutListItem[];
};

/** Every exercise the user has completed, with all-time counts. */
export type ExerciseSummary = {
  id: string;
  isCustom: boolean;
  lastDoneAt: string;
  latest: PreviousPerformance | null;
  name: string;
  primaryMuscle?: { name: string; slug: string };
  timesDone: number;
  trackingType: TrackingType;
};

export type TrainingTotals = {
  sets: number;
  workouts: number;
};

export type ExerciseTimeline = {
  exerciseId: string;
  exposures: Array<
    HistoryExercise & {
      endedAt: string;
      sessionId: string;
      templateName: string;
    }
  >;
  name: string;
  trackingType: TrackingType;
};
