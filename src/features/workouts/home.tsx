import Link from "next/link";

import {
  beginWorkoutCreation,
  dismissHomeWorkoutGuidance,
} from "@/features/guidance/actions";
import {
  hasSeenGuidance,
  type GuidanceState,
} from "@/features/guidance/model";

import {
  PlanningSwitch,
  PrimaryNav,
} from "@/features/navigation/primary-nav";
import { startWorkout } from "@/features/sessions/actions";

import { AppHeader } from "@/features/navigation/app-header";

import styles from "./home.module.css";

export type HomeWorkout = {
  exerciseCount: number;
  firstTarget?: string;
  id: string;
  lastTrainedAt?: string;
  name: string;
  preview: string[];
};

export type HomeActiveSession = {
  id: string;
  startedAt: string;
  templateName: string;
};

type WorkoutHomeProps = {
  dayEndsAt: string;
  activeSession?: HomeActiveSession;
  displayName?: string;
  email?: string;
  guidance: GuidanceState;
  view?: "home" | "workouts";
  workouts: HomeWorkout[];
};

export function WorkoutHome({
  dayEndsAt,
  activeSession,
  displayName,
  email,
  guidance,
  view = "home",
  workouts,
}: WorkoutHomeProps) {
  const isEmpty = workouts.length === 0;
  const isWorkoutView = view === "workouts";
  const showFirstWorkoutGuide =
    !isWorkoutView &&
    isEmpty &&
    !hasSeenGuidance(guidance, "home.create-workout.v1");
  const accountLabel = displayName || email?.split("@")[0] || "You";

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <AppHeader accountLabel={accountLabel} />

        {isWorkoutView && <PlanningSwitch active="workouts" />}

        <section className={styles.lead}>
          <p>{isWorkoutView ? "Workouts" : "Home"}</p>
          <h1>
            {isWorkoutView
              ? isEmpty
                ? "Make room for your routine."
                : "A little structure. Your pace."
              : activeSession
              ? "Pick up where you left off."
              : isEmpty
                ? "Start with something simple."
                : `Welcome back, ${accountLabel}.`}
          </h1>
          <span>
            {isWorkoutView
              ? isEmpty
                ? "Create a workout from the exercise library, then reuse it whenever you train."
                : `${workouts.length} saved ${workouts.length === 1 ? "workout" : "workouts"}. Ready whenever you are.`
              : activeSession
              ? `${activeSession.templateName} is in progress. Your logged sets are saved.`
              : isEmpty
              ? "Choose a few exercises you enjoy. Save them as a plan, and take it one session at a time."
              : `${workouts.length} saved ${workouts.length === 1 ? "workout" : "workouts"}. Choose one whenever you’re ready.`}
          </span>
        </section>

        {activeSession && (
          <section className={styles.activeSessionCard}>
            <div>
              <span>Active session</span>
              <small>{formatStartTime(activeSession.startedAt)}</small>
            </div>
            <h2>{activeSession.templateName}</h2>
            <Link href={`/sessions/${activeSession.id}`}>
              Resume session <span>→</span>
            </Link>
          </section>
        )}

        {isEmpty && !activeSession ? (
          <section className={styles.emptyState}>
            <div className={styles.emptyLedger} aria-hidden="true">
              <span>Your first workout template</span>
              <ol>
                <li><i>01</i><b>Add your first exercise</b></li>
                <li><i>02</i><b>Choose your sets and reps</b></li>
                <li><i>03</i><b>Save it for next time</b></li>
              </ol>
            </div>

            {showFirstWorkoutGuide && (
              <aside className={styles.guide} aria-label="Getting started tip">
                <div>
                  <span>Start here</span>
                  <strong>You can adjust your plan as you go.</strong>
                </div>
                <form action={dismissHomeWorkoutGuidance}>
                  <button type="submit" aria-label="Dismiss getting started tip">×</button>
                </form>
              </aside>
            )}

            <form action={beginWorkoutCreation}>
              <button className={styles.primaryAction} type="submit">
                Create a workout template <span>→</span>
              </button>
            </form>
          </section>
        ) : (
          <section className={styles.workoutSection}>
            <header>
              <div>
                <span>Your collection</span>
                <strong>Choose a workout</strong>
              </div>
              <Link href={isWorkoutView ? "/workouts/new" : "/workouts"}>
                {isWorkoutView ? "+ New workout" : "View all workouts"}
              </Link>
            </header>

            {activeSession && <p className={styles.sessionHint}>Finish your active session before starting another workout.</p>}
            <div className={styles.workoutList}>
              {workouts.map((workout) => (
                <article className={styles.workoutCard} key={workout.id}>
                  <div className={styles.cardIndex} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6 3h12v18H6zM9 8h6M9 12h6M9 16h3" /></svg></div>
                  <div className={styles.cardBody}>
                    <span>{workout.exerciseCount} exercises</span>
                    <h2>{workout.name}</h2>
                    <p>
                      {workout.firstTarget
                        ? `Next: ${workout.firstTarget}`
                        : workout.preview.length > 0
                        ? workout.preview.join(" · ")
                        : "No exercises configured"}
                    </p>
                    {workout.lastTrainedAt && <small>Last trained {formatRelativeDate(workout.lastTrainedAt)}</small>}
                  </div>
                  {isWorkoutView && (
                    <Link href={`/workouts/${workout.id}/edit`} aria-label={`Edit ${workout.name}`}>
                      Edit
                    </Link>
                  )}
                  <form action={startWorkout.bind(null, workout.id)}>
                    <button
                      disabled={Boolean(activeSession)}
                      title={
                        activeSession
                          ? "Finish the active workout before starting another"
                          : `Start ${workout.name}`
                      }
                      type="submit"
                    >
                      Start <span>→</span>
                    </button>
                  </form>
                </article>
              ))}
            </div>
          </section>
        )}

        <PrimaryNav
          dayEndsAt={dayEndsAt}
          active={isWorkoutView ? "workouts" : "home"}
          activeSessionId={activeSession?.id}
        />
      </section>
    </main>
  );
}

function formatStartTime(startedAt: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(startedAt));
}

function formatRelativeDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}
