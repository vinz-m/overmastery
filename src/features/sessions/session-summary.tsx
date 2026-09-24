import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/ssr";

import {
  comparePerformance,
  completedPerformance,
  formatReps,
} from "./performance";
import { planOutcomeLabel, projectSetPlan } from "./set-policy";
import { sessionSummaryLead } from "./summary-copy";
import styles from "./session-summary.module.css";
import type { ActiveSession } from "./types";
import { formatDisplayLoad, loadUnit, type UnitSystem } from "@/lib/units";
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
          <strong>SESSION COMPLETE</strong>
          <span>{session.templateName}</span>
        </header>
        <section className={styles.lead}>
          <div>{lead.metric}</div>
          <p>{lead.label}</p>
          <h1>{lead.headline}</h1>
          <span>
            {completedSets} completed working{" "}
            {completedSets === 1 ? "set" : "sets"}
          </span>
        </section>
        <section className={styles.results}>
          {results.map(({ comparison, current, exercise, plan }) => (
            <article key={exercise.id}>
              <div>
                <h2>{exercise.name}</h2>
                <span>
                  {current
                    ? performanceLabel(
                        exercise.trackingType,
                        current.loadKg,
                        current.reps,
                        current.unit ?? unitSystem,
                      )
                    : "Skipped"}
                </span>
                <small>{planOutcomeLabel(plan)}</small>
              </div>
              <strong className={styles[comparison.state]}>
                {comparison.label}
              </strong>
            </article>
          ))}
        </section>
        <Link className={styles.homeAction} href="/" transitionTypes={navBack}>
          Done <ArrowRightIcon aria-hidden="true" size={19} weight="bold" />
        </Link>
      </section>
    </main>
  );
}

function performanceLabel(
  trackingType: ActiveSession["exercises"][number]["trackingType"],
  loadKg: number | null,
  reps: number[],
  unitSystem: UnitSystem,
) {
  if (trackingType === "bodyweight_reps") return `${formatReps(reps)} reps`;
  return `${formatDisplayLoad(loadKg, unitSystem)} ${loadUnit(unitSystem)} · ${formatReps(reps)}`;
}
