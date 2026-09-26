import Link from "next/link";
import { CaretRightIcon } from "@phosphor-icons/react/ssr";

import { ExerciseLibrary } from "@/features/exercises/exercise-library";
import { beginWorkoutCreation } from "@/features/guidance/actions";
import { ContextualTip } from "@/features/guidance/contextual-tip";
import { hasSeenGuidance, type GuidanceState } from "@/features/guidance/model";
import {
  formatHomeDate,
  formatHomeTime,
  formatMonthDay,
  greetingFor,
  trainingWeek,
} from "./home-date";
import type { ExerciseCatalogItem } from "./types";
import type {
  PreviousPerformance,
  TrackingType,
} from "@/features/sessions/types";
import { formatSetLoad } from "@/features/sessions/performance";
import type { UnitSystem } from "@/lib/units";
import { selectNextWorkout } from "./workout-overview";
import { StartWorkoutForm } from "./start-workout-form";
import { WorkoutPreview } from "./workout-preview";
import {
  WorkoutPlanningWorkspace,
  type PlanningView,
} from "./planning-workspace";
import styles from "./home.module.css";
import { navForward, navTab } from "@/features/navigation/page-transition";

export type HomeWorkoutExercise = {
  exerciseId: string;
  name: string;
  trackingType: TrackingType;
};
export type HomeWorkout = {
  exerciseCount: number;
  exercises: HomeWorkoutExercise[];
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
type Props = {
  activeSession?: HomeActiveSession;
  archivedCatalog?: ExerciseCatalogItem[];
  catalog?: ExerciseCatalogItem[];
  displayName?: string;
  email?: string;
  guidance: GuidanceState;
  featuredPrevious?: Record<string, PreviousPerformance>;
  planningView?: PlanningView;
  timeZone: string;
  trainedAt?: string[];
  unitSystem?: UnitSystem;
  view?: "home" | "workouts";
  workouts: HomeWorkout[];
};

export function WorkoutHome({
  activeSession,
  archivedCatalog = [],
  catalog = [],
  displayName,
  email,
  featuredPrevious = {},
  guidance,
  planningView = "workouts",
  timeZone,
  trainedAt = [],
  unitSystem = "metric",
  view = "home",
  workouts,
}: Props) {
  const accountLabel = displayName || email?.split("@")[0] || "You";
  if (view === "workouts") {
    return (
      <WorkoutPlanningWorkspace
        defaultView={planningView}
        exerciseLibrary={
          <ExerciseLibrary
            archivedCatalog={archivedCatalog}
            catalog={catalog}
          />
        }
        guidance={guidance}
        workoutTemplates={
          <WorkoutLibrary activeSession={activeSession} workouts={workouts} />
        }
      />
    );
  }

  return (
    <Today
      accountLabel={accountLabel}
      activeSession={activeSession}
      featuredPrevious={featuredPrevious}
      guidance={guidance}
      timeZone={timeZone}
      trainedAt={trainedAt}
      unitSystem={unitSystem}
      workouts={workouts}
    />
  );
}

function Today({
  accountLabel,
  activeSession,
  featuredPrevious,
  guidance,
  timeZone,
  trainedAt,
  unitSystem,
  workouts,
}: {
  accountLabel: string;
  activeSession?: HomeActiveSession;
  featuredPrevious: Record<string, PreviousPerformance>;
  guidance: GuidanceState;
  timeZone: string;
  trainedAt: string[];
  unitSystem: UnitSystem;
  workouts: HomeWorkout[];
}) {
  const featured = selectNextWorkout(workouts);
  const now = new Date();
  const showGuide = !hasSeenGuidance(guidance, "home.overview.v1");
  return (
    <main className={styles.tabContent}>
      <header className={styles.todayHeader}>
        <p>{formatHomeDate(now, timeZone)}</p>
        <h1>Today</h1>
        <span>
          {greetingFor(now, timeZone)}, {accountLabel}.
        </span>
      </header>

      {showGuide && (
        <ContextualTip
          body={
            activeSession
              ? "Pick up the workout you already started. Your completed sets are saved."
              : featured
                ? "Start a saved workout here, and see your recent training at a glance."
                : "Create a workout once, then come back here whenever you’re ready to train."
          }
          guidanceKey="home.overview.v1"
          title="Your next workout starts here"
        />
      )}

      {activeSession ? (
        <section className={styles.resumeCard}>
          <div>
            <span>Workout in progress</span>
            <small>
              Started {formatHomeTime(activeSession.startedAt, timeZone)}
            </small>
          </div>
          <h2>{activeSession.templateName}</h2>
          <p>Your completed sets are saved.</p>
          <Link
            href={`/sessions/${activeSession.id}`}
            transitionTypes={navForward}
          >
            Resume workout{" "}
            <CaretRightIcon aria-hidden="true" size={20} weight="bold" />
          </Link>
        </section>
      ) : featured ? (
        <section className={styles.todayWorkout}>
          <div className={styles.todayWorkoutLabel}>
            <span>Suggested next</span>
            {featured.lastTrainedAt && (
              <small>
                Last trained {formatMonthDay(featured.lastTrainedAt, timeZone)}
              </small>
            )}
          </div>
          <h2>{featured.name}</h2>
          {featured.exercises.length > 0 ? (
            <WorkoutPreview
              rows={featured.exercises.map((exercise) => ({
                id: exercise.exerciseId,
                name: exercise.name,
                result: lastResult(
                  exercise.trackingType,
                  featuredPrevious[exercise.exerciseId],
                  unitSystem,
                ),
              }))}
            />
          ) : (
            <p>
              {featured.firstTarget ?? `${featured.exerciseCount} exercises`}
            </p>
          )}
          <StartWorkoutForm
            label="Start workout"
            showArrow
            workoutId={featured.id}
          />
          {workouts.length > 1 && (
            <Link
              className={styles.alternateWorkout}
              href="/workouts"
              transitionTypes={navTab}
            >
              Choose another workout
            </Link>
          )}
        </section>
      ) : (
        <section className={styles.emptyState}>
          <h2>Create your first workout</h2>
          <p>
            Choose exercises once, then reuse the workout whenever you train.
          </p>
          <form action={beginWorkoutCreation}>
            <button className={styles.primaryAction} type="submit">
              Create workout{" "}
              <CaretRightIcon aria-hidden="true" size={20} weight="bold" />
            </button>
          </form>
        </section>
      )}

      <TrainingWeek timeZone={timeZone} trainedAt={trainedAt} />
    </main>
  );
}

function TrainingWeek({
  timeZone,
  trainedAt,
}: {
  timeZone: string;
  trainedAt: string[];
}) {
  const week = trainingWeek(trainedAt, new Date(), timeZone);
  const summary =
    week.thisWeek === 0
      ? "No workouts yet this week"
      : `${week.thisWeek} ${week.thisWeek === 1 ? "workout" : "workouts"} this week`;
  return (
    <section aria-labelledby="training-week-title" className={styles.week}>
      <header>
        <h2 id="training-week-title">This week</h2>
        <Link href="/progress" transitionTypes={navTab}>
          View progress
        </Link>
      </header>
      <div className={styles.weekCard}>
        <ol className={styles.weekDays}>
          {week.days.map((day) => (
            <li
              className={[
                day.trained && styles.weekTrained,
                day.isToday && styles.weekToday,
                day.isFuture && styles.weekFuture,
              ]
                .filter(Boolean)
                .join(" ")}
              key={day.key}
            >
              <span aria-hidden="true">{day.label}</span>
              <i aria-hidden="true" />
              <span className={styles.visuallyHidden}>
                {weekdayName(day.key)}
                {day.isToday ? " (today)" : ""}:{" "}
                {day.trained ? "trained" : "no workout"}
              </span>
            </li>
          ))}
        </ol>
        <p>
          {summary}
          <span> · {week.lastWeek} last week</span>
        </p>
      </div>
    </section>
  );
}

function weekdayName(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
  }).format(new Date(`${date}T00:00:00Z`));
}

function lastResult(
  trackingType: TrackingType,
  previous: PreviousPerformance | undefined,
  unitSystem: UnitSystem,
) {
  const reps = previous?.reps[0];
  if (!previous || reps === undefined) return "New";
  const load = formatSetLoad(
    trackingType,
    previous.loadKg,
    previous.unit ?? unitSystem,
  );
  return load ? `${load} × ${reps}` : `${reps} reps`;
}

function WorkoutLibrary({
  activeSession,
  workouts,
}: {
  activeSession?: HomeActiveSession;
  workouts: HomeWorkout[];
}) {
  return (
    <>
      <header className={styles.libraryHeader}>
        <div>
          <p>Library</p>
          <h1>Workouts</h1>
          <span>
            {workouts.length} saved{" "}
            {workouts.length === 1 ? "workout" : "workouts"}
          </span>
        </div>
        <Link href="/workouts/new" transitionTypes={navForward}>
          New workout
        </Link>
      </header>
      {activeSession && (
        <Link
          className={styles.activeBanner}
          href={`/sessions/${activeSession.id}`}
          transitionTypes={navForward}
        >
          <span>Workout in progress</span>
          <strong>Resume {activeSession.templateName}</strong>
          <small>Finish or discard it to start another workout.</small>
          <i>
            <CaretRightIcon aria-hidden="true" size={22} weight="bold" />
          </i>
        </Link>
      )}
      {workouts.length ? (
        <section className={styles.workoutList}>
          {workouts.map((workout) => (
            <article className={styles.workoutRow} key={workout.id}>
              <div>
                <span>{workout.exerciseCount} exercises</span>
                <h2>{workout.name}</h2>
                <p>
                  {workout.preview.slice(0, 3).join(" · ") ||
                    "No exercises configured"}
                </p>
              </div>
              <div className={styles.workoutActions}>
                <Link
                  aria-label={`Edit ${workout.name}`}
                  href={`/workouts/${workout.id}/edit`}
                  transitionTypes={navForward}
                >
                  Edit plan
                </Link>
                <StartWorkoutForm
                  disabled={Boolean(activeSession)}
                  label="Start"
                  workoutId={workout.id}
                />
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className={styles.emptyState}>
          <h2>No workouts yet</h2>
          <p>Create a reusable workout from the exercise library.</p>
          <Link
            className={styles.primaryLink}
            href="/workouts/new"
            transitionTypes={navForward}
          >
            Create workout{" "}
            <CaretRightIcon aria-hidden="true" size={20} weight="bold" />
          </Link>
        </section>
      )}
    </>
  );
}
