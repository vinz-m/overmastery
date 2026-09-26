import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/ssr";

import {
  comparePerformance,
  completedPerformance,
  formatPerformance,
} from "./performance";
import { planOutcomeLabel, projectSetPlan } from "./set-policy";
import { sessionSummaryLead } from "./summary-copy";
import styles from "./session-summary.module.css";
import type { ActiveSession } from "./types";
import type { UnitSystem } from "@/lib/units";
import { navBack } from "@/features/navigation/page-transition";

export function SessionSummary({
  session,
  unitSystem,
}: {
  session: ActiveSession;
  unitSystem: UnitSystem;
}) {
  const results = session.exercises.map((exercise) => {
    const current = completedPerformance(exercise);
    return {
      comparison: comparePerformance(
        current,
        exercise.previous,
        exercise.trackingType,
        current?.unit ?? unitSystem,
      ),
      current,
      exercise,
      plan: projectSetPlan(exercise.sets, exercise.targetSets),
    };
  });
  const improved = results.filter(
    (result) => result.comparison.state === "improved",
  ).length;
  const baselines = results.filter(
    (result) =>
      result.current !== null && result.exercise.previous.reps.length === 0,
  ).length;
  const lead = sessionSummaryLead({ baselines, improved });
  const completedSets = session.exercises.reduce(
    (count, exercise) =>
      count + exercise.sets.filter((set) => set.status === "completed").length,
    0,
  );

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header>
          <strong>Workout complete</strong>
          <span>{session.templateName}</span>
        </header>
        <section className={styles.lead}>
          <div>{lead.metric}</div>
          <p>{lead.label}</p>
          <h1>{lead.headline}</h1>
          <span>
            {results.filter((result) => result.current).length} of{" "}
            {results.length} exercises · {completedSets}{" "}
            {completedSets === 1 ? "set" : "sets"} done
          </span>
        </section>
        <section className={styles.results}>
          {results.map(({ comparison, current, exercise, plan }) =>
            // A skipped exercise gets one quiet line, so it can't pass for a done one.
            current ? (
              <article key={exercise.id}>
                <div>
                  <h2>{exercise.name}</h2>
                  <span>
                    {formatPerformance(
                      exercise.trackingType,
                      current.loadKg,
                      current.reps,
                      current.unit ?? unitSystem,
                    )}
                  </span>
                  <small>{planOutcomeLabel(plan)}</small>
                </div>
                <strong className={styles[comparison.state]}>
                  {comparison.label}
                </strong>
              </article>
            ) : (
              <article className={styles.skipped} key={exercise.id}>
                <h2>{exercise.name}</h2>
                <strong>Skipped</strong>
              </article>
            ),
          )}
        </section>
        <Link className={styles.homeAction} href="/" transitionTypes={navBack}>
          Done <ArrowRightIcon aria-hidden="true" size={19} weight="bold" />
        </Link>
      </section>
    </main>
  );
}
