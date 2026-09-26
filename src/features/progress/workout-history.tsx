"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { loadOlderWorkouts } from "./actions";
import { formatMonth } from "./format";
import styles from "./progress.module.css";
import type { WorkoutHistoryPage, WorkoutListItem } from "./types";
import { WorkoutRow } from "./workout-row";

/** Every finished workout by month, loading older ones as the list nears its end. */
export function WorkoutHistory({ initial }: { initial: WorkoutHistoryPage }) {
  const [workouts, setWorkouts] = useState(initial.workouts);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    if (!cursor || loading) return;
    startLoading(async () => {
      try {
        const page = await loadOlderWorkouts(cursor);
        setWorkouts((current) => {
          const shown = new Set(current.map((workout) => workout.id));
          return [
            ...current,
            ...page.workouts.filter((workout) => !shown.has(workout.id)),
          ];
        });
        setCursor(page.nextCursor);
        setError(null);
      } catch {
        setError(
          "Older workouts couldn’t be loaded. Check your connection and try again.",
        );
      }
    });
  }, [cursor, loading]);

  // Load the next page before the end comes into view. After a failure, wait
  // for the button so a dead connection isn't retried on every scroll.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !cursor || error) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [cursor, error, loadMore]);

  return (
    <>
      {groupByMonth(workouts).map((month) => (
        <section
          aria-labelledby={`month-${month.key}`}
          className={styles.monthGroup}
          key={month.key}
        >
          <h2 id={`month-${month.key}`}>{month.label}</h2>
          <div className={styles.sessionList}>
            {month.workouts.map((workout) => (
              <WorkoutRow key={workout.id} workout={workout} />
            ))}
          </div>
        </section>
      ))}
      <div className={styles.historyEnd} ref={sentinelRef}>
        {error && <p role="alert">{error}</p>}
        {cursor ? (
          <button disabled={loading} onClick={loadMore} type="button">
            {loading ? "Loading…" : "Show older workouts"}
          </button>
        ) : (
          workouts.length > 0 && <p>That’s every workout you’ve logged.</p>
        )}
      </div>
    </>
  );
}

function groupByMonth(workouts: WorkoutListItem[]) {
  const months: Array<{
    key: string;
    label: string;
    workouts: WorkoutListItem[];
  }> = [];
  for (const workout of workouts) {
    const label = formatMonth(workout.endedAt);
    const month = months.at(-1);
    if (month?.label === label) month.workouts.push(workout);
    else
      months.push({
        key: label.replace(/\s+/g, "-").toLowerCase(),
        label,
        workouts: [workout],
      });
  }
  return months;
}
