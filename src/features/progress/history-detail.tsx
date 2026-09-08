import Link from "next/link";

import { formatDuration, formatPerformance, formatSessionDate } from "./format";
import styles from "./progress.module.css";
import type { ExerciseTimeline, HistorySession } from "./types";
import type { UnitSystem } from "@/lib/units";

export function SessionHistoryDetail({ session, unitSystem }: { session: HistorySession; unitSystem: UnitSystem }) {
  return (
    <main className={styles.darkPage}>
      <section className={styles.darkShell}>
        <header className={styles.detailHeader}>
          <Link href="/progress" aria-label="Back to progress">←</Link>
          <div><span>Training record</span><strong>{formatSessionDate(session.endedAt, true)}</strong></div>
        </header>
        <section className={styles.detailLead}>
          <p>Completed session</p>
          <h1>{session.templateName}</h1>
          <span>{session.completedSets} working sets · {formatDuration(session.startedAt, session.endedAt)}</span>
        </section>
        <section className={styles.detailResults}>
          {session.exercises.map((exercise, index) => {
            const content = (
              <>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h2>{exercise.name}</h2>
                  <p>{exercise.completedSets ? formatPerformance(exercise.trackingType, exercise.loadKg, exercise.reps, unitSystem) : "Skipped"}</p>
                  <small>{planLabel(exercise.plannedCompletedSets, exercise.plannedSets, exercise.skippedSets, exercise.extraCompletedSets)}</small>
                </div>
                <strong className={styles[exercise.comparison.state]}>{exercise.comparison.label}</strong>
              </>
            );
            return exercise.exerciseId ? (
              <Link href={`/progress/exercises/${exercise.exerciseId}`} key={exercise.id}>{content}</Link>
            ) : (
              <article key={exercise.id}>{content}</article>
            );
          })}
        </section>
        <Link className={styles.backAction} href="/progress">Back to progress <span>→</span></Link>
      </section>
    </main>
  );
}

export function ExerciseHistoryDetail({ timeline, unitSystem }: { timeline: ExerciseTimeline; unitSystem: UnitSystem }) {
  const latest = timeline.exposures[0];
  return (
    <main className={styles.page}>
      <section className={styles.detailShell}>
        <header className={styles.lightDetailHeader}>
          <Link href="/progress" aria-label="Back to progress">←</Link>
          <span>Exercise history</span>
        </header>
        <section className={styles.exerciseLead}>
          <p>{timeline.exposures.length} recorded {timeline.exposures.length === 1 ? "exposure" : "exposures"}</p>
          <h1>{timeline.name}</h1>
          <span>Latest · {formatPerformance(timeline.trackingType, latest.loadKg, latest.reps, unitSystem)}</span>
        </section>
        <section className={styles.timeline}>
          {timeline.exposures.map((exposure, index) => (
            <Link href={`/progress/sessions/${exposure.sessionId}`} key={exposure.id}>
              <time dateTime={exposure.endedAt}>
                <b>{formatSessionDate(exposure.endedAt)}</b>
                <small>{index === 0 ? "Latest" : `Exposure ${timeline.exposures.length - index}`}</small>
              </time>
              <div>
                <strong>{formatPerformance(timeline.trackingType, exposure.loadKg, exposure.reps, unitSystem)}</strong>
                <small>{exposure.templateName} · {planLabel(exposure.plannedCompletedSets, exposure.plannedSets, exposure.skippedSets, exposure.extraCompletedSets)}</small>
              </div>
              <span className={styles[exposure.comparison.state]}>{exposure.comparison.label}</span>
            </Link>
          ))}
        </section>
        <Link className={styles.lightBackAction} href="/progress">All progress <span>→</span></Link>
      </section>
    </main>
  );
}

function planLabel(completed: number, planned: number, skipped: number, extras: number) {
  if (planned === 0) return `${extras} completed`;
  const skippedCopy = skipped ? ` · ${skipped} skipped` : "";
  const extraCopy = extras ? ` · +${extras} extra` : "";
  return `${completed}/${planned} planned sets completed${skippedCopy}${extraCopy}`;
}
