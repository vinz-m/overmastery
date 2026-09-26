import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/ssr";

import { ContextualTip } from "@/features/guidance/contextual-tip";
import { hasSeenGuidance, type GuidanceState } from "@/features/guidance/model";

import { countLabel, formatSessionDate } from "./format";
import styles from "./progress.module.css";
import type {
  ExerciseSummary,
  TrainingTotals,
  WorkoutHistoryPage,
} from "./types";
import { WorkoutRow } from "./workout-row";
import type { UnitSystem } from "@/lib/units";
import { groupExercises } from "@/features/exercises/exercise-filter";
import { formatPerformance } from "@/features/sessions/performance";
import { navForward, navTab } from "@/features/navigation/page-transition";

export function ProgressHome({
  exercises,
  guidance,
  recent,
  totals,
  unitSystem,
}: {
  exercises: ExerciseSummary[];
  guidance: GuidanceState;
  recent: WorkoutHistoryPage;
  totals: TrainingTotals;
  unitSystem: UnitSystem;
}) {
  const latest = recent.workouts[0];
  // Grouped like the exercise library; most recently done first in each group.
  const exerciseGroups = groupExercises(exercises);

  return (
    <main className={styles.tabContent}>
      <section className={styles.lead}>
        <h1>Progress</h1>
        <span>
          Review recent workouts and see how each exercise is changing.
        </span>
      </section>

      {!hasSeenGuidance(guidance, "progress.overview.v1") && (
        <ContextualTip
          body="Open a finished workout to see its results, or choose an exercise to follow its progress over time."
          guidanceKey="progress.overview.v1"
          title="See what changed"
        />
      )}

      {!latest ? (
        <section className={styles.emptyState}>
          <span>No workouts yet</span>
          <h2>Finish a workout to see your progress here.</h2>
          <Link href="/workouts" transitionTypes={navTab}>
            Choose a workout{" "}
            <ArrowRightIcon aria-hidden="true" size={18} weight="bold" />
          </Link>
        </section>
      ) : (
        <>
          <section className={styles.snapshot}>
            <div>
              <span>Workouts</span>
              <strong>{totals.workouts}</strong>
              <small>logged</small>
            </div>
            <div>
              <span>Working sets</span>
              <strong>{totals.sets}</strong>
              <small>completed</small>
            </div>
            <div>
              <span>Last trained</span>
              <strong>{formatSessionDate(latest.endedAt)}</strong>
              <small>{latest.templateName}</small>
            </div>
          </section>

          <section className={styles.section}>
            <header>
              <div>
                <span>Recent</span>
                <h2>Workouts</h2>
              </div>
            </header>
            <div className={styles.sessionList}>
              {recent.workouts.map((workout) => (
                <WorkoutRow key={workout.id} workout={workout} />
              ))}
            </div>
            {recent.nextCursor && (
              <Link
                className={styles.seeAll}
                href="/progress/sessions"
                transitionTypes={navForward}
              >
                See all {totals.workouts} workouts
                <ArrowRightIcon aria-hidden="true" size={16} weight="bold" />
              </Link>
            )}
          </section>

          <section className={styles.section}>
            <header>
              <div>
                <span>By exercise</span>
                <h2>Exercise history</h2>
              </div>
              <small>{countLabel(exercises.length, "exercise")}</small>
            </header>
            {exerciseGroups.map((group) => (
              <section
                aria-labelledby={`exercise-group-${group.key}`}
                className={styles.exerciseGroup}
                key={group.key}
              >
                <h3 id={`exercise-group-${group.key}`}>{group.label}</h3>
                <div className={styles.exerciseList}>
                  {group.exercises.map((exercise) => (
                    <Link
                      href={`/progress/exercises/${exercise.id}`}
                      key={exercise.id}
                      transitionTypes={navForward}
                    >
                      <div>
                        <strong>{exercise.name}</strong>
                        <small>
                          {formatSessionDate(exercise.lastDoneAt)} · logged{" "}
                          {exercise.timesDone === 1
                            ? "once"
                            : `${exercise.timesDone} times`}
                        </small>
                      </div>
                      {exercise.latest && (
                        <span>
                          {formatPerformance(
                            exercise.trackingType,
                            exercise.latest.loadKg,
                            exercise.latest.reps,
                            exercise.latest.unit ?? unitSystem,
                          )}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
