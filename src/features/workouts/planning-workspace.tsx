"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import { ContextualTip } from "@/features/guidance/contextual-tip";
import { hasSeenGuidance, type GuidanceState } from "@/features/guidance/model";

import styles from "./planning-workspace.module.css";

export type PlanningView = "exercises" | "workouts";

export function WorkoutPlanningWorkspace({
  defaultView,
  exerciseLibrary,
  guidance,
  workoutTemplates,
}: {
  defaultView: PlanningView;
  exerciseLibrary: React.ReactNode;
  guidance: GuidanceState;
  workoutTemplates: React.ReactNode;
}) {
  const [viewState, setViewState] = useState({
    direction: defaultView === "exercises" ? 1 : -1,
    view: defaultView,
  });
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const syncWithUrl = () => {
      const nextView = viewFromUrl();
      setViewState(() => ({
        direction: nextView === "exercises" ? 1 : -1,
        view: nextView,
      }));
    };

    window.addEventListener("popstate", syncWithUrl);
    return () => window.removeEventListener("popstate", syncWithUrl);
  }, []);

  function selectView(nextView: PlanningView) {
    if (nextView === viewState.view) return;

    const nextUrl =
      nextView === "exercises" ? "/workouts?view=exercises" : "/workouts";
    window.history.pushState(null, "", nextUrl);
    setViewState({
      direction: nextView === "exercises" ? 1 : -1,
      view: nextView,
    });
  }

  return (
    <main className={styles.tabContent}>
        <nav
          className={styles.tabs}
          aria-label="Planning library"
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            const nextView =
              viewState.view === "workouts" ? "exercises" : "workouts";
            selectView(nextView);
            window.requestAnimationFrame(() => {
              document.getElementById(`${nextView}-tab`)?.focus();
            });
          }}
          role="tablist"
        >
          <PlanningTab
            active={viewState.view === "workouts"}
            controls="workout-templates-panel"
            id="workouts-tab"
            onSelect={() => selectView("workouts")}
          >
            Workout templates
          </PlanningTab>
          <PlanningTab
            active={viewState.view === "exercises"}
            controls="exercise-library-panel"
            id="exercises-tab"
            onSelect={() => selectView("exercises")}
          >
            Exercise library
          </PlanningTab>
        </nav>

        {!hasSeenGuidance(guidance, "workouts.overview.v1") && (
          <ContextualTip
            body="Build reusable workout templates here, or switch to the exercise library to browse and create exercises."
            guidanceKey="workouts.overview.v1"
            title="Plan your training"
          />
        )}

        <motion.div
          animate={{
            opacity: viewState.view === "workouts" ? 1 : 0,
            x:
              viewState.view === "workouts" || reduceMotion
                ? 0
                : -8 * viewState.direction,
          }}
          className={styles.panel}
          hidden={viewState.view !== "workouts"}
          id="workout-templates-panel"
          initial={false}
          aria-labelledby="workouts-tab"
          role="tabpanel"
        >
          {workoutTemplates}
        </motion.div>

        <motion.div
          animate={{
            opacity: viewState.view === "exercises" ? 1 : 0,
            x:
              viewState.view === "exercises" || reduceMotion
                ? 0
                : 8 * viewState.direction,
          }}
          className={styles.panel}
          hidden={viewState.view !== "exercises"}
          id="exercise-library-panel"
          initial={false}
          aria-labelledby="exercises-tab"
          role="tabpanel"
        >
          {exerciseLibrary}
        </motion.div>

    </main>
  );
}

function PlanningTab({
  active,
  children,
  controls,
  id,
  onSelect,
}: {
  active: boolean;
  children: React.ReactNode;
  controls: string;
  id: string;
  onSelect: () => void;
}) {
  return (
    <button
      aria-controls={controls}
      aria-selected={active}
      id={id}
      onClick={onSelect}
      role="tab"
      tabIndex={active ? 0 : -1}
      type="button"
    >
      {active && (
        <motion.span
          className={styles.tabIndicator}
          layoutId="planning-tab-indicator"
          transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
        />
      )}
      <span>{children}</span>
    </button>
  );
}

function viewFromUrl(): PlanningView {
  return new URLSearchParams(window.location.search).get("view") === "exercises"
    ? "exercises"
    : "workouts";
}
