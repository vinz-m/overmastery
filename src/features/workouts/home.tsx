import Link from "next/link";
import { CaretRightIcon } from "@phosphor-icons/react/ssr";

import { ExerciseLibrary } from "@/features/exercises/exercise-library";
import { beginWorkoutCreation } from "@/features/guidance/actions";
import { ContextualTip } from "@/features/guidance/contextual-tip";
import { hasSeenGuidance, type GuidanceState } from "@/features/guidance/model";
import { AppHeader } from "@/features/navigation/app-header";
import { PrimaryNav } from "@/features/navigation/primary-nav";
import {
  formatHomeDate,
  formatHomeTime,
  formatMonthDay,
  greetingFor,
} from "./home-date";
import type { ExerciseCatalogItem } from "./types";
import { selectNextWorkout } from "./workout-overview";
import { StartWorkoutForm } from "./start-workout-form";
import {
  WorkoutPlanningWorkspace,
  type PlanningView,
} from "./planning-workspace";
import styles from "./home.module.css";

export type HomeWorkout = { exerciseCount: number; firstTarget?: string; id: string; lastTrainedAt?: string; name: string; preview: string[] };
export type HomeActiveSession = { id: string; startedAt: string; templateName: string };
type Props = {
  dayEndsAt: string;
  activeSession?: HomeActiveSession;
  archivedCatalog?: ExerciseCatalogItem[];
  catalog?: ExerciseCatalogItem[];
  displayName?: string;
  email?: string;
  guidance: GuidanceState;
  lastTrainedAt?: string;
  planningView?: PlanningView;
  timeZone: string;
  view?: "home" | "workouts";
  workouts: HomeWorkout[];
};

export function WorkoutHome({ dayEndsAt, activeSession, archivedCatalog = [], catalog = [], displayName, email, guidance, lastTrainedAt, planningView = "workouts", timeZone, view = "home", workouts }: Props) {
  const accountLabel = displayName || email?.split("@")[0] || "You";
  if (view === "workouts") {
    return (
      <WorkoutPlanningWorkspace
        accountLabel={accountLabel}
        activeSessionId={activeSession?.id}
        dayEndsAt={dayEndsAt}
        defaultView={planningView}
        exerciseLibrary={<ExerciseLibrary archivedCatalog={archivedCatalog} catalog={catalog} />}
        guidance={guidance}
        workoutTemplates={
          <WorkoutLibrary activeSession={activeSession} workouts={workouts} />
        }
      />
    );
  }

  return <Today accountLabel={accountLabel} activeSession={activeSession} dayEndsAt={dayEndsAt} guidance={guidance} lastTrainedAt={lastTrainedAt} timeZone={timeZone} workouts={workouts} />;
}

function Today({ accountLabel, activeSession, dayEndsAt, guidance, lastTrainedAt, timeZone, workouts }: { accountLabel: string; activeSession?: HomeActiveSession; dayEndsAt: string; guidance: GuidanceState; lastTrainedAt?: string; timeZone: string; workouts: HomeWorkout[] }) {
  const featured = selectNextWorkout(workouts);
  const now = new Date();
  const showGuide = !hasSeenGuidance(guidance, "home.overview.v1");
  return <main className={styles.page}><section className={styles.shell}>
    <AppHeader accountLabel={accountLabel} />
    <header className={styles.todayHeader}><p>{formatHomeDate(now, timeZone)}</p><h1>Today</h1><span>{greetingFor(now, timeZone)}, {accountLabel}.</span></header>

    {showGuide && <ContextualTip
      body={activeSession
        ? "Resume the session you already started. Your completed sets are waiting here."
        : featured
          ? "Start a saved workout here. Today keeps your next session and recent training close."
          : "Create a workout template once, then return here whenever you are ready to train."}
      guidanceKey="home.overview.v1"
      title="Your next session starts here"
    />}

    {activeSession ? <section className={styles.resumeCard}>
      <div><span>Workout in progress</span><small>Started {formatHomeTime(activeSession.startedAt, timeZone)}</small></div>
      <h2>{activeSession.templateName}</h2><p>Your completed sets are saved.</p>
      <Link href={`/sessions/${activeSession.id}`}>Resume workout <CaretRightIcon aria-hidden="true" size={20} weight="bold" /></Link>
    </section> : featured ? <section className={styles.todayWorkout}>
      <div className={styles.todayWorkoutLabel}><span>Suggested next</span>{featured.lastTrainedAt && <small>Last trained {formatMonthDay(featured.lastTrainedAt, timeZone)}</small>}</div>
      <h2>{featured.name}</h2><p>{featured.firstTarget ?? `${featured.exerciseCount} exercises`}</p>
      <StartWorkoutForm label="Start workout" showArrow workoutId={featured.id} />
      {workouts.length > 1 && <Link className={styles.alternateWorkout} href="/workouts">Choose another workout</Link>}
    </section> : <section className={styles.emptyState}>
      <h2>Create your first workout</h2><p>Choose exercises once, then reuse the workout whenever you train.</p>
      <form action={beginWorkoutCreation}><button className={styles.primaryAction} type="submit">Create workout <CaretRightIcon aria-hidden="true" size={20} weight="bold" /></button></form>
    </section>}

    <section className={styles.todaySummary}>
      <header><h2>At a glance</h2><Link href="/progress">View progress</Link></header>
      <div><article><span>Saved workouts</span><strong>{workouts.length}</strong></article><article><span>Last trained</span><strong>{lastTrainedAt ? formatMonthDay(lastTrainedAt, timeZone) : "—"}</strong></article></div>
    </section>
    <PrimaryNav active="home" activeSessionId={activeSession?.id} dayEndsAt={dayEndsAt} />
  </section></main>;
}

function WorkoutLibrary({ activeSession, workouts }: { activeSession?: HomeActiveSession; workouts: HomeWorkout[] }) {
  return <>
    <header className={styles.libraryHeader}><div><p>Library</p><h1>Workouts</h1><span>{workouts.length} saved {workouts.length === 1 ? "workout" : "workouts"}</span></div><Link href="/workouts/new">New workout</Link></header>
    {activeSession && <Link className={styles.activeBanner} href={`/sessions/${activeSession.id}`}><span>Workout in progress</span><strong>Resume {activeSession.templateName}</strong><i><CaretRightIcon aria-hidden="true" size={22} weight="bold" /></i></Link>}
    {workouts.length ? <section className={styles.workoutList}>{workouts.map((workout) => <article className={styles.workoutRow} key={workout.id}>
      <div><span>{workout.exerciseCount} exercises</span><h2>{workout.name}</h2><p>{workout.preview.slice(0, 3).join(" · ") || "No exercises configured"}</p></div>
      <div className={styles.workoutActions}>
        <Link aria-label={`Edit ${workout.name}`} href={`/workouts/${workout.id}/edit`}>Edit plan</Link>
        <StartWorkoutForm disabled={Boolean(activeSession)} label="Start" workoutId={workout.id} />
      </div>
    </article>)}</section> : <section className={styles.emptyState}><h2>No workouts yet</h2><p>Create a reusable workout from the exercise library.</p><Link className={styles.primaryLink} href="/workouts/new">Create workout <CaretRightIcon aria-hidden="true" size={20} weight="bold" /></Link></section>}
  </>;
}
