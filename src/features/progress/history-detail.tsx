import Link from "next/link";
import { ArrowLeftIcon } from "@phosphor-icons/react/ssr";

import {
  countLabel,
  formatDuration,
  formatSessionDate,
  planLabel,
  timeLabel,
} from "./format";
import styles from "./progress.module.css";
import { SessionRecord } from "./session-record";
import type {
  ExerciseTimeline,
  HistorySession,
  WorkoutHistoryPage,
} from "./types";
import { WorkoutHistory } from "./workout-history";
import type { UnitSystem } from "@/lib/units";
import { formatPerformance } from "@/features/sessions/performance";
import { navBack, navForward } from "@/features/navigation/page-transition";

export function SessionHistoryDetail({
  session,
  unitSystem,
}: {
  session: HistorySession;
  unitSystem: UnitSystem;
}) {
  const doneExercises = session.exercises.filter(
    (exercise) => exercise.completedSets > 0,
  ).length;
  return (
    <main className={styles.darkPage}>
      <section className={styles.darkShell}>
        <header className={styles.detailHeader}>
          <Link
            href="/progress"
            aria-label="Back to progress"
            transitionTypes={navBack}
          >
            <ArrowLeftIcon aria-hidden="true" size={20} weight="bold" />
          </Link>
          <div>
            <span>Training record</span>
            <strong>{formatSessionDate(session.endedAt, true)}</strong>
          </div>
        </header>
        <section className={styles.detailLead}>
          <p>Completed workout</p>
          <h1>{session.templateName}</h1>
          <span>
            {doneExercises} of {session.exercises.length} exercises ·{" "}
            {session.completedSets} working sets ·{" "}
            {formatDuration(session.startedAt, session.endedAt)}
          </span>
        </section>
        <SessionRecord session={session} unitSystem={unitSystem} />
      </section>
    </main>
  );
}

export function WorkoutHistoryDetail({
  initial,
  total,
}: {
  initial: WorkoutHistoryPage;
  total: number;
}) {
  return (
    <main className={styles.page}>
      <section className={styles.detailShell}>
        <header className={styles.lightDetailHeader}>
          <Link
            href="/progress"
            aria-label="Back to progress"
            transitionTypes={navBack}
          >
            <ArrowLeftIcon aria-hidden="true" size={20} weight="bold" />
          </Link>
          <span>Workout history</span>
        </header>
        <section className={styles.exerciseLead}>
          <p>{countLabel(total, "workout")} logged</p>
          <h1>All workouts</h1>
        </section>
        <WorkoutHistory initial={initial} />
      </section>
    </main>
  );
}

export function ExerciseHistoryDetail({
  timeline,
}: {
  timeline: ExerciseTimeline;
}) {
  const latest = timeline.exposures[0];
  return (
    <main className={styles.page}>
      <section className={styles.detailShell}>
        <header className={styles.lightDetailHeader}>
          <Link
            href="/progress"
            aria-label="Back to progress"
            transitionTypes={navBack}
          >
            <ArrowLeftIcon aria-hidden="true" size={20} weight="bold" />
          </Link>
          <span>Exercise history</span>
        </header>
        <section className={styles.exerciseLead}>
          <p>
            Logged{" "}
            {timeline.exposures.length === 1
              ? "once"
              : `${timeline.exposures.length} times`}
          </p>
          <h1>{timeline.name}</h1>
          <span>
            Latest ·{" "}
            {formatPerformance(
              timeline.trackingType,
              latest.loadKg,
              latest.reps,
              latest.displayUnit,
            )}
          </span>
        </section>
        <section className={styles.timeline}>
          {timeline.exposures.map((exposure, index) => (
            <Link
              href={`/progress/sessions/${exposure.sessionId}`}
              key={exposure.id}
              transitionTypes={navForward}
            >
              <time dateTime={exposure.endedAt}>
                <b>{formatSessionDate(exposure.endedAt)}</b>
                <small>
                  {index === 0
                    ? "Latest"
                    : timeLabel(timeline.exposures.length - index)}
                </small>
              </time>
              <div>
                <strong>
                  {formatPerformance(
                    timeline.trackingType,
                    exposure.loadKg,
                    exposure.reps,
                    exposure.displayUnit,
                  )}
                </strong>
                <small>
                  {exposure.templateName} ·{" "}
                  {planLabel(
                    exposure.plannedCompletedSets,
                    exposure.plannedSets,
                    exposure.skippedSets,
                    exposure.extraCompletedSets,
                  )}
                </small>
              </div>
              <span className={styles[exposure.comparison.state]}>
                {exposure.comparison.label}
              </span>
            </Link>
          ))}
        </section>
      </section>
    </main>
  );
}
