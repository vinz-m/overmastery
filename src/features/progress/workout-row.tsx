import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/ssr";

import { navForward } from "@/features/navigation/page-transition";

import { countLabel } from "./format";
import styles from "./progress.module.css";
import type { WorkoutListItem } from "./types";

/** One finished workout in a list; place inside `styles.sessionList`. */
export function WorkoutRow({ workout }: { workout: WorkoutListItem }) {
  const endedAt = new Date(workout.endedAt);
  return (
    <Link
      href={`/progress/sessions/${workout.id}`}
      transitionTypes={navForward}
    >
      <time dateTime={workout.endedAt}>
        <b>{endedAt.getDate()}</b>
        <small>
          {new Intl.DateTimeFormat("en", { month: "short" }).format(endedAt)}
        </small>
      </time>
      <div>
        <strong>{workout.templateName}</strong>
        <small>
          {countLabel(workout.completedSets, "set")} ·{" "}
          {countLabel(workout.doneExercises, "exercise")}
        </small>
      </div>
      <span className={styles.sessionAction}>
        <span>
          {workout.improvedExercises > 0
            ? `${workout.improvedExercises} improved`
            : "View"}
        </span>
        <ArrowRightIcon aria-hidden="true" size={16} weight="bold" />
      </span>
    </Link>
  );
}
