import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/ssr";


import { PrimaryNav } from "@/features/navigation/primary-nav";
import { ContextualTip } from "@/features/guidance/contextual-tip";
import { hasSeenGuidance, type GuidanceState } from "@/features/guidance/model";

import { formatPerformance, formatSessionDate } from "./format";
import { AppHeader } from "@/features/navigation/app-header";

import styles from "./progress.module.css";
import type { ExerciseTimeline, HistorySession } from "./types";
import type { UnitSystem } from "@/lib/units";

export function ProgressHome({
  dayEndsAt,
  accountLabel,
  activeSessionId,
  exercises,
  guidance,
  sessions,
  unitSystem,
}: {
  dayEndsAt: string;
  accountLabel: string;
  activeSessionId?: string;
  exercises: ExerciseTimeline[];
  guidance: GuidanceState;
  sessions: HistorySession[];
  unitSystem: UnitSystem;
}) {
  const totalSets = sessions.reduce(
    (total, session) => total + session.completedSets,
    0,
  );
  const latest = sessions[0];

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <AppHeader accountLabel={accountLabel} />

        <section className={styles.lead}>
          <p>Progress</p>
          <h1>Progress</h1>
          <span>Review recent sessions and see how each exercise is changing.</span>
        </section>

        {!hasSeenGuidance(guidance, "progress.overview.v1") && (
          <ContextualTip
            body="Open a finished session for its results, or choose an exercise to follow its performance over time."
            guidanceKey="progress.overview.v1"
            title="See what changed"
          />
        )}

        {sessions.length === 0 ? (
          <section className={styles.emptyState}>
            <span>No completed sessions yet</span>
            <h2>Finish your first session to start your story.</h2>
            <Link href="/workouts">Choose a workout <ArrowRightIcon aria-hidden="true" size={18} weight="bold" /></Link>
          </section>
        ) : (
          <>
            <section className={styles.snapshot}>
              <div>
                <span>Recorded so far</span>
                <strong>{sessions.length}</strong>
                <small>{sessions.length === 1 ? "session" : "sessions"}</small>
              </div>
              <div>
                <span>Working sets</span>
                <strong>{totalSets}</strong>
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
                <div><span>Recent</span><h2>Sessions</h2></div>
                <small>{sessions.length} shown</small>
              </header>
              <div className={styles.sessionList}>
                {sessions.slice(0, 12).map((session) => (
                  <Link href={`/progress/sessions/${session.id}`} key={session.id}>
                    <time dateTime={session.endedAt}>
                      <b>{new Date(session.endedAt).getDate()}</b>
                      <small>{new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(session.endedAt))}</small>
                    </time>
                    <div>
                      <strong>{session.templateName}</strong>
                      <small>{session.completedSets} sets · {session.exercises.filter((exercise) => exercise.completedSets > 0).length} exercises</small>
                    </div>
                    <span className={styles.sessionAction}>
                      <span>{session.improvedExercises > 0
                        ? `${session.improvedExercises} improved`
                        : "View"}</span>
                      <ArrowRightIcon aria-hidden="true" size={16} weight="bold" />
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            <section className={styles.section}>
              <header>
                <div><span>By exercise</span><h2>Exercise history</h2></div>
                <small>{exercises.length} recorded</small>
              </header>
              <div className={styles.exerciseList}>
                {exercises.map((exercise) => {
                  const latestExposure = exercise.exposures[0];
                  return (
                    <Link href={`/progress/exercises/${exercise.exerciseId}`} key={exercise.exerciseId}>
                      <div>
                        <strong>{exercise.name}</strong>
                        <small>{formatSessionDate(latestExposure.endedAt)} · {exercise.exposures.length} {exercise.exposures.length === 1 ? "exposure" : "exposures"}</small>
                      </div>
                      <span>{formatPerformance(exercise.trackingType, latestExposure.loadKg, latestExposure.reps, unitSystem)}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          </>
        )}

        <PrimaryNav active="progress" activeSessionId={activeSessionId} dayEndsAt={dayEndsAt} />
      </section>
    </main>
  );
}
