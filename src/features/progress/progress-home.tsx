import Link from "next/link";


import { PrimaryNav } from "@/features/navigation/primary-nav";

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
  sessions,
  unitSystem,
}: {
  dayEndsAt: string;
  accountLabel: string;
  activeSessionId?: string;
  exercises: ExerciseTimeline[];
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
          <h1>Your work, over time.</h1>
          <span>
            A place to look back. See your sessions and how each exercise changes over time.
          </span>
        </section>

        {sessions.length === 0 ? (
          <section className={styles.emptyState}>
            <span>No completed sessions yet</span>
            <h2>Finish your first session to start your story.</h2>
            <Link href="/workouts">Choose a workout <b>→</b></Link>
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
                <div><span>Recent sessions</span><h2>The training record</h2></div>
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
                    <span>
                      {session.improvedExercises > 0
                        ? `${session.improvedExercises} improved`
                        : "View session"} →
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            <section className={styles.section}>
              <header>
                <div><span>Exercise history</span><h2>Your exercise history</h2></div>
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
