"use client";

import Link from "next/link";
import { unstable_isUnrecognizedActionError } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  ArrowLeftIcon,
  CaretDownIcon,
  CaretRightIcon,
  CheckIcon,
  CircleIcon,
  DotsThreeIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useDragControls } from "motion/react";

import {
  addExtraSet,
  finishSession,
  removeWorkingSet,
  reopenSet,
  restoreMissingPlannedSet,
  restoreSkippedSet,
  skipExercise,
  swapExercise,
} from "./actions";
import {
  convertLoadInput,
  loadStep,
  loadUnit,
  toDisplayLoad,
  toKilograms,
  type UnitSystem,
} from "@/lib/units";
import { scrollToPageTop } from "@/lib/motion";
import {
  filterExercises,
  groupExercises,
} from "@/features/exercises/exercise-filter";
import { useDismissibleDetails } from "@/features/ui/use-dismissible-details";
import { trackingLabel } from "@/features/workouts/tracking";
import { formatSetLoad, loadLabel } from "./performance";
import {
  canAddExtraSet,
  planOutcomeLabel,
  projectSetPlan,
  removalActionLabel,
} from "./set-policy";
import { prefillForSet } from "./set-prefill";
import { useCurrentExercise } from "./current-exercise";
import { DiscardWorkoutButton } from "./discard-workout-button";
import { applyPendingSets, useOfflineSetQueue } from "./offline-set-queue";
import styles from "./active-session.module.css";
import type {
  ActiveExercise,
  ActiveSession,
  CompleteSetInput,
  SessionMutationResult,
  SwapExerciseOption,
} from "./types";
import { navBack } from "@/features/navigation/page-transition";

type Mutate = (
  action: () => Promise<SessionMutationResult>,
  afterSuccess?: () => void,
) => void;
type LogSet = (input: CompleteSetInput) => void;

const offlineMessage =
  "You’re offline. This change needs a connection, so try again once you’re back online.";

export function ActiveSessionScreen({
  catalog,
  rememberedExerciseId,
  session: serverSession,
  unitSystem,
}: {
  catalog: SwapExerciseOption[];
  rememberedExerciseId: string | null;
  session: ActiveSession;
  unitSystem: UnitSystem;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const showRejected = useCallback((text: string) => setMessage(text), []);
  const queue = useOfflineSetQueue(serverSession, showRejected);
  const session = applyPendingSets(serverSession, queue.pending);
  const waitingToSync = queue.waiting;
  // The app was redeployed since this page loaded, so its server actions no
  // longer exist. Retrying can't help; only a reload can.
  const [outdated, setOutdated] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [currentExerciseId, setCurrentExerciseId] =
    useCurrentExercise(rememberedExerciseId);
  const [sheet, setSheet] = useState<"exercises" | "replace" | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);
  const sheetOpen = sheet !== null;
  const [elapsedMinutes, setElapsedMinutes] = useState(() =>
    minutesSince(session.startedAt),
  );
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const timer = window.setInterval(
      () => setElapsedMinutes(minutesSince(session.startedAt)),
      30_000,
    );
    return () => window.clearInterval(timer);
  }, [session.startedAt]);

  const openSheet = (next: "exercises" | "replace") => {
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    setSheet(next);
  };
  const closeSheet = () => {
    setSheet(null);
    window.requestAnimationFrame(() => returnFocusRef.current?.focus());
  };

  useEffect(() => {
    if (!sheetOpen) return;
    closeRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSheet();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [sheetOpen]);

  // The remembered exercise may belong to an earlier workout.
  const currentExercise =
    session.exercises.find((exercise) => exercise.id === currentExerciseId) ??
    session.exercises.find(hasOpenSets) ??
    session.exercises.find((exercise) => exercise.status !== "skipped") ??
    session.exercises[0];
  const completedSets = session.exercises.reduce(
    (count, exercise) =>
      count + exercise.sets.filter((set) => set.status === "completed").length,
    0,
  );
  const mutate: Mutate = (action, afterSuccess) => {
    startTransition(async () => {
      setMessage(null);
      let result: SessionMutationResult;
      try {
        result = await action();
      } catch (error) {
        if (unstable_isUnrecognizedActionError(error)) setOutdated(true);
        // Otherwise the request never completed (usually no signal).
        else setMessage(offlineMessage);
        return;
      }
      if (!result.ok) {
        setMessage(
          result.message ?? "That change could not be saved. Try again.",
        );
        return;
      }
      // The action re-renders this route in its own response; no refresh needed.
      afterSuccess?.();
    });
  };
  // Shown as done at once; the queue sends it in the background.
  const logSet: LogSet = (input) => {
    setMessage(null);
    queue.enqueue(input);
  };
  // A set that hasn't synced yet is simply un-logged on the device; one the
  // server already has must be reopened there too.
  const reopen = (setId: string) => {
    const queued = queue.pending[setId];
    if (queued) queue.discard(setId);
    if (!queued || queued.synced)
      mutate(() => reopenSet({ sessionId: session.id, setId }));
  };

  // Only reachable if starting a workout failed partway; without this the
  // screen would be blank with no way to clear the session.
  if (!currentExercise)
    return (
      <main className={styles.page}>
        <section className={styles.shell}>
          <header className={styles.stickyHeader}>
            <Link
              aria-label="Leave active workout"
              href="/"
              transitionTypes={navBack}
            >
              <ArrowLeftIcon aria-hidden="true" size={22} weight="bold" />
            </Link>
            <div>
              <strong>{session.templateName}</strong>
            </div>
          </header>
          <div className={styles.content}>
            <div className={styles.statusCard}>
              <strong>This workout didn’t finish setting up</strong>
              <p>
                It has no exercises. Discard it, then start the workout again.
              </p>
              <DiscardWorkoutButton
                className={styles.emptyDiscard}
                completedSets={0}
                sessionId={session.id}
              />
            </div>
          </div>
        </section>
      </main>
    );
  const currentIndex = session.exercises.findIndex(
    (exercise) => exercise.id === currentExercise.id,
  );
  // Only exercises still waiting on sets, so the last one done doesn't loop
  // back to the start of the list.
  const nextExercise = [
    ...session.exercises.slice(currentIndex + 1),
    ...session.exercises.slice(0, currentIndex),
  ].find(hasOpenSets);
  const allSetsLogged =
    completedSets > 0 && !session.exercises.some(hasOpenSets);
  const finish = () => mutate(() => finishSession(session.id));
  const showExercise = (exerciseId: string) => {
    const target = session.exercises.find(
      (exercise) => exercise.id === exerciseId,
    );
    if (target)
      setDirection(target.position >= currentExercise.position ? 1 : -1);
    setCurrentExerciseId(exerciseId);
  };
  const jumpTo = (exerciseId: string) => {
    showExercise(exerciseId);
    closeSheet();
    scrollToPageTop();
  };
  const moveAfterSkip = () => {
    if (nextExercise) showExercise(nextExercise.id);
  };

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header
          className={styles.stickyHeader}
          inert={sheetOpen ? true : undefined}
        >
          <Link
            aria-label="Leave active workout"
            href="/"
            transitionTypes={navBack}
          >
            <ArrowLeftIcon aria-hidden="true" size={22} weight="bold" />
          </Link>
          <div>
            <strong>{session.templateName}</strong>
            <span>{elapsedMinutes} min</span>
          </div>
          <button
            disabled={pending || completedSets === 0 || waitingToSync > 0}
            onClick={finish}
            type="button"
          >
            Finish
          </button>
        </header>
        {message && (
          <div className={styles.errorBanner} role="alert">
            {message}
          </div>
        )}
        {outdated ? (
          <div className={styles.syncBanner} role="alert">
            Overmastery was updated. Reload to keep logging.{" "}
            {waitingToSync > 0 &&
              "Your unsynced sets are saved on this phone and will sync after you reload. "}
            <button
              className={styles.bannerAction}
              onClick={() => window.location.reload()}
              type="button"
            >
              Reload
            </button>
          </div>
        ) : (
          queue.stalled &&
          waitingToSync > 0 && (
            <div className={styles.syncBanner} role="status">
              {waitingToSync} {waitingToSync === 1 ? "set is" : "sets are"}{" "}
              saved on this phone and will sync when you’re back online. Finish
              once they’ve synced.
            </div>
          )
        )}
        <div className={styles.content} inert={sheetOpen ? true : undefined}>
          <div className={styles.exerciseHeader}>
            <span className={styles.exerciseCount}>
              Exercise {currentExercise.position + 1} of{" "}
              {session.exercises.length}
            </span>
            <ExerciseOptions
              completedSets={completedSets}
              exercise={currentExercise}
              moveAfterSkip={moveAfterSkip}
              mutate={mutate}
              onReplace={() => openSheet("replace")}
              pending={pending}
              sessionId={session.id}
              waitingToSync={waitingToSync}
            />
          </div>
          <AnimatePresence custom={direction} initial={false} mode="wait">
            <motion.div
              animate="shown"
              custom={direction}
              exit="leaving"
              initial="entering"
              key={currentExercise.id}
              transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
              variants={exerciseSlide}
            >
              <button
                aria-haspopup="dialog"
                className={styles.exercisePicker}
                onClick={() => openSheet("exercises")}
                type="button"
              >
                <span>
                  <strong>{currentExercise.name}</strong>
                  <small>{trackingLabel(currentExercise.trackingType)}</small>
                </span>
                <CaretDownIcon aria-hidden="true" size={20} weight="bold" />
              </button>
              <FocusedSet
                allSetsLogged={allSetsLogged}
                completedSets={completedSets}
                exercise={currentExercise}
                logSet={logSet}
                nextExercise={nextExercise}
                onFinish={finish}
                onNext={(exerciseId) => {
                  showExercise(exerciseId);
                  scrollToPageTop();
                }}
                pending={pending}
                sessionId={session.id}
                unitSystem={unitSystem}
                waitingToSync={waitingToSync}
              />
              <SetProgress
                exercise={currentExercise}
                mutate={mutate}
                onReopen={reopen}
                pending={pending}
                sessionId={session.id}
              />
            </motion.div>
          </AnimatePresence>
          {/* Once this exercise is done its card offers the next step instead. */}
          {nextExercise && hasOpenSets(currentExercise) && (
            <button
              className={styles.upNext}
              onClick={() => {
                showExercise(nextExercise.id);
                scrollToPageTop();
              }}
              type="button"
            >
              <span>Up next</span>
              <strong>{nextExercise.name}</strong>
              <i aria-hidden="true">
                <CaretRightIcon size={24} weight="bold" />
              </i>
            </button>
          )}
        </div>
        {sheet === "exercises" && (
          <BottomSheet
            closeLabel="Done"
            closeRef={closeRef}
            onClose={closeSheet}
            title="Exercises"
          >
            <ExerciseList
              currentExerciseId={currentExercise.id}
              exercises={session.exercises}
              onJump={jumpTo}
            />
          </BottomSheet>
        )}
        {sheet === "replace" && (
          <BottomSheet
            closeLabel="Cancel"
            closeRef={closeRef}
            fixedHeight
            onClose={closeSheet}
            title={`Replace ${currentExercise.name}`}
          >
            <ReplacementList
              catalog={catalog}
              exercise={currentExercise}
              onPick={(replacementExerciseId) => {
                closeSheet();
                mutate(() =>
                  swapExercise({
                    replacementExerciseId,
                    sessionExerciseId: currentExercise.id,
                    sessionId: session.id,
                  }),
                );
              }}
              session={session}
            />
          </BottomSheet>
        )}
      </section>
    </main>
  );
}

// Next exercise slides in from the right, previous from the left.
const exerciseSlide = {
  entering: (direction: 1 | -1) => ({ opacity: 0, x: 28 * direction }),
  leaving: (direction: 1 | -1) => ({
    opacity: 0,
    x: -28 * direction,
    transition: { duration: 0.12 },
  }),
  shown: { opacity: 1, x: 0 },
};

function ExerciseOptions({
  completedSets,
  exercise,
  moveAfterSkip,
  mutate,
  onReplace,
  pending,
  sessionId,
  waitingToSync,
}: {
  completedSets: number;
  exercise: ActiveExercise;
  moveAfterSkip: () => void;
  mutate: Mutate;
  onReplace: () => void;
  pending: boolean;
  sessionId: string;
  waitingToSync: number;
}) {
  const canChange = !exercise.sets.some((set) => set.status === "completed");
  const menuRef = useDismissibleDetails();
  const closeMenu = () => {
    if (menuRef.current) menuRef.current.open = false;
  };
  return (
    <details className={styles.exerciseMenu} ref={menuRef}>
      <summary aria-label={`Options for ${exercise.name}`}>
        <DotsThreeIcon aria-hidden="true" size={22} weight="bold" />
      </summary>
      <div>
        <strong>This exercise</strong>
        <p>Changes apply to today only. Your saved workout stays the same.</p>
        <button
          className={styles.menuAction}
          disabled={!canChange || pending}
          onClick={() => {
            closeMenu();
            onReplace();
          }}
          type="button"
        >
          Replace exercise
        </button>
        <button
          className={styles.skipButton}
          disabled={!canChange || pending}
          onClick={() => {
            closeMenu();
            mutate(
              () => skipExercise({ sessionExerciseId: exercise.id, sessionId }),
              moveAfterSkip,
            );
          }}
          type="button"
        >
          Skip exercise
        </button>
        {!canChange && (
          <small>Reopen logged sets before changing this exercise.</small>
        )}
        <hr />
        <strong>This workout</strong>
        <p>Stop now without saving it to your history.</p>
        {/* The server can't see unsynced sets, so discarding now would delete
            the workout outright and orphan them on this phone. */}
        <DiscardWorkoutButton
          className={styles.discardAction}
          completedSets={completedSets}
          disabled={pending || waitingToSync > 0}
          sessionId={sessionId}
        />
        {waitingToSync > 0 && (
          <small>Wait for your saved sets to sync before discarding.</small>
        )}
      </div>
    </details>
  );
}

function FocusedSet({
  allSetsLogged,
  completedSets,
  exercise,
  logSet,
  nextExercise,
  onFinish,
  onNext,
  pending,
  sessionId,
  unitSystem,
  waitingToSync,
}: {
  allSetsLogged: boolean;
  completedSets: number;
  exercise: ActiveExercise;
  logSet: LogSet;
  nextExercise: ActiveExercise | undefined;
  onFinish: () => void;
  onNext: (exerciseId: string) => void;
  pending: boolean;
  sessionId: string;
  unitSystem: UnitSystem;
  waitingToSync: number;
}) {
  const activeSet = exercise.sets.find((set) => set.status === "planned");
  const completedCount = exercise.sets.filter(
    (set) => set.status === "completed",
  ).length;
  const plan = projectSetPlan(exercise.sets, exercise.targetSets);
  if (allSetsLogged)
    return (
      <div className={styles.statusCard} role="status">
        <span>Workout complete</span>
        <strong>
          {completedSets} {completedSets === 1 ? "set" : "sets"} logged
        </strong>
        <p>Finish to save it and see how today compares.</p>
        {/* Unsynced sets would be missing from the summary. */}
        <button
          className={styles.completeSet}
          disabled={pending || waitingToSync > 0}
          onClick={onFinish}
          type="button"
        >
          Finish workout
        </button>
        {waitingToSync > 0 && (
          <p>Your last sets are still syncing. Finish once they’re saved.</p>
        )}
      </div>
    );
  const nextAction = nextExercise && (
    <button
      className={styles.completeSet}
      onClick={() => onNext(nextExercise.id)}
      type="button"
    >
      Next: {nextExercise.name}
    </button>
  );
  if (exercise.status === "skipped")
    return (
      <div className={styles.statusCard}>
        <span>Skipped today</span>
        <p>Choose another exercise to continue training.</p>
        {nextAction}
      </div>
    );
  if (!activeSet)
    return (
      <div className={styles.statusCard} role="status">
        <span>Exercise complete</span>
        <strong>{planOutcomeLabel(plan)}</strong>
        {nextAction}
      </div>
    );
  return (
    <ActiveSetEditor
      completedCount={completedCount}
      exercise={exercise}
      // A replaced exercise keeps its set ids, so key by the exercise too or
      // the inputs keep the old exercise's values.
      key={`${exercise.exerciseId}:${activeSet.id}`}
      logSet={logSet}
      pending={pending}
      sessionId={sessionId}
      set={activeSet}
      unitSystem={unitSystem}
    />
  );
}

function ActiveSetEditor({
  completedCount,
  exercise,
  logSet,
  pending,
  sessionId,
  set,
  unitSystem,
}: {
  completedCount: number;
  exercise: ActiveExercise;
  logSet: LogSet;
  pending: boolean;
  sessionId: string;
  set: ActiveExercise["sets"][number];
  unitSystem: UnitSystem;
}) {
  const prefill = prefillForSet(set, exercise.sets, exercise.previous);
  // Machines are labelled in kg or lb, so each set can be entered in either.
  const [unit, setUnit] = useState<UnitSystem>(prefill.unit ?? unitSystem);
  const [load, setLoad] = useState(
    prefill.loadKg === null
      ? ""
      : String(toDisplayLoad(prefill.loadKg, prefill.unit ?? unitSystem)),
  );
  const otherUnit: UnitSystem = unit === "imperial" ? "metric" : "imperial";
  const switchUnit = () => {
    if (load !== "" && Number.isFinite(Number(load)))
      setLoad(String(convertLoadInput(Number(load), unit, otherUnit)));
    setUnit(otherUnit);
  };
  const [reps, setReps] = useState(
    prefill.reps === null ? "" : String(prefill.reps),
  );
  // Bodyweight exercises can carry added weight (a plate, a dip belt) but don't need it.
  const loadOptional = exercise.trackingType === "bodyweight_reps";
  const hasLoad = load !== "";
  const canComplete =
    reps !== "" && (hasLoad ? Number(load) >= 0 : loadOptional);
  return (
    <section className={styles.activeSet}>
      <header>
        <div>
          <span>Current set</span>
          <strong>{setName(set, exercise.targetSets)}</strong>
        </div>
        <small>{completedCount} completed</small>
      </header>
      <p className={styles.previousSet}>
        Previous:{" "}
        <strong>
          {previousSetLabel(
            exercise,
            set.position,
            exercise.previous.unit ?? unitSystem,
          )}
        </strong>
      </p>
      <div className={styles.setInputs}>
        <label>
          <span>{loadLabel(exercise.trackingType)}</span>
          <div>
            <input
              aria-label={`${loadLabel(exercise.trackingType)} in ${unit === "imperial" ? "pounds" : "kilograms"}${loadOptional ? ", optional" : ""}`}
              inputMode="decimal"
              min="0"
              onChange={(event) => setLoad(event.target.value)}
              placeholder={loadOptional ? "0" : undefined}
              step={loadStep(unit)}
              type="number"
              value={load}
            />
            <button
              aria-label={`Switch to ${otherUnit === "imperial" ? "pounds" : "kilograms"}`}
              className={styles.unitToggle}
              onClick={switchUnit}
              type="button"
            >
              {loadUnit(unit)}
            </button>
          </div>
        </label>
        <label>
          <span>Reps</span>
          <input
            aria-label="Reps"
            inputMode="numeric"
            min="0"
            onChange={(event) => setReps(event.target.value)}
            placeholder="0"
            type="number"
            value={reps}
          />
        </label>
      </div>
      <button
        className={styles.completeSet}
        disabled={pending || !canComplete}
        onClick={() =>
          logSet({
            loadKg: hasLoad ? toKilograms(Number(load), unit) : null,
            loadUnit: hasLoad ? unit : null,
            reps: Number(reps),
            sessionId,
            setId: set.id,
          })
        }
        type="button"
      >
        Complete set
      </button>
    </section>
  );
}

function SetProgress({
  exercise,
  mutate,
  onReopen,
  pending,
  sessionId,
}: {
  exercise: ActiveExercise;
  mutate: Mutate;
  onReopen: (setId: string) => void;
  pending: boolean;
  sessionId: string;
}) {
  const canAddExtra = canAddExtraSet(exercise.sets);
  const plan = projectSetPlan(exercise.sets, exercise.targetSets);
  const activeSet = exercise.sets.find((set) => set.status === "planned");
  return (
    <section className={styles.progressSection}>
      <div
        className={styles.setProgress}
        aria-label={`${exercise.sets.filter((set) => set.status === "completed").length} sets completed`}
      >
        {exercise.sets.map((set) =>
          set.status === "completed" ? (
            <button
              aria-label={`Edit ${setName(set, exercise.targetSets)}`}
              className={styles.progressDone}
              disabled={pending}
              key={set.id}
              onClick={() => onReopen(set.id)}
              type="button"
            >
              <CheckIcon aria-hidden="true" size={14} weight="bold" />
            </button>
          ) : set.status === "skipped" ? (
            <button
              aria-label={`Restore ${setName(set, exercise.targetSets)}`}
              className={styles.progressSkipped}
              disabled={pending || !set.isPlanned}
              key={set.id}
              onClick={() =>
                mutate(() => restoreSkippedSet({ sessionId, setId: set.id }))
              }
              type="button"
            >
              <MinusIcon aria-hidden="true" size={14} weight="bold" />
            </button>
          ) : (
            <span
              className={set.id === activeSet?.id ? styles.progressCurrent : ""}
              key={set.id}
            >
              {set.position + 1}
            </span>
          ),
        )}
        {plan.plannedSlots
          .filter((slot) => slot.synthetic)
          .map((slot) => (
            <button
              aria-label={`Restore set ${slot.position + 1}`}
              className={styles.progressSkipped}
              disabled={pending}
              key={`missing-${slot.position}`}
              onClick={() =>
                mutate(() =>
                  restoreMissingPlannedSet({
                    position: slot.position,
                    sessionExerciseId: exercise.id,
                    sessionId,
                  }),
                )
              }
              type="button"
            >
              <MinusIcon aria-hidden="true" size={14} weight="bold" />
            </button>
          ))}
      </div>
      {exercise.status !== "skipped" && (
        <div className={styles.setActions}>
          <button
            disabled={pending || !canAddExtra}
            onClick={() =>
              mutate(() =>
                addExtraSet({ sessionExerciseId: exercise.id, sessionId }),
              )
            }
            type="button"
          >
            <PlusIcon aria-hidden="true" size={16} weight="bold" />
            Add set
          </button>
          {activeSet && (
            <RemoveSetButton
              exercise={exercise}
              mutate={mutate}
              pending={pending}
              sessionId={sessionId}
              set={activeSet}
            />
          )}
        </div>
      )}
      {exercise.status !== "skipped" && !canAddExtra && (
        <small className={styles.setActionsHint}>
          Complete the extra set before adding another.
        </small>
      )}
    </section>
  );
}

function RemoveSetButton({
  exercise,
  mutate,
  pending,
  sessionId,
  set,
}: {
  exercise: ActiveExercise;
  mutate: Mutate;
  pending: boolean;
  sessionId: string;
  set: ActiveExercise["sets"][number];
}) {
  const nonSkippedSets = exercise.sets.filter(
    (item) => item.status !== "skipped",
  ).length;
  return (
    <button
      className={styles.removeSet}
      disabled={pending || nonSkippedSets <= 1}
      onClick={() =>
        mutate(() => removeWorkingSet({ sessionId, setId: set.id }))
      }
      type="button"
    >
      <MinusIcon aria-hidden="true" size={16} weight="bold" />
      {removalActionLabel({ isPlanned: set.isPlanned })}
    </button>
  );
}

// Pulling down past this distance, or flicking faster than this, closes the sheet.
const sheetCloseOffset = 96;
const sheetCloseVelocity = 500;

function BottomSheet({
  children,
  closeLabel,
  closeRef,
  fixedHeight = false,
  onClose,
  title,
}: {
  children: React.ReactNode;
  closeLabel: string;
  closeRef: React.RefObject<HTMLButtonElement | null>;
  fixedHeight?: boolean;
  onClose: () => void;
  title: string;
}) {
  const dragControls = useDragControls();

  useEffect(() => {
    // Keep swipes on the scrim from scrolling the workout underneath.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const startDrag = (event: React.PointerEvent) => {
    if ((event.target as HTMLElement).closest("button, input")) return;
    dragControls.start(event);
  };

  return (
    <div className={styles.sheetLayer}>
      <button
        aria-label={`Close ${title}`}
        className={styles.scrim}
        onClick={onClose}
      />
      <motion.section
        aria-labelledby="sheet-title"
        aria-modal="true"
        className={
          fixedHeight
            ? `${styles.exerciseSheet} ${styles.sheetFixed}`
            : styles.exerciseSheet
        }
        drag="y"
        dragConstraints={{ bottom: 0, top: 0 }}
        dragControls={dragControls}
        dragElastic={{ bottom: 1, top: 0 }}
        dragListener={false}
        onDragEnd={(_, info) => {
          if (
            info.offset.y > sheetCloseOffset ||
            info.velocity.y > sheetCloseVelocity
          )
            onClose();
        }}
        role="dialog"
      >
        <div className={styles.sheetHandle} onPointerDown={startDrag}>
          <div aria-hidden="true" className={styles.sheetGrabber} />
          <header>
            <h2 id="sheet-title">{title}</h2>
            <button onClick={onClose} ref={closeRef}>
              {closeLabel}
            </button>
          </header>
        </div>
        {children}
      </motion.section>
    </div>
  );
}

function ExerciseList({
  currentExerciseId,
  exercises,
  onJump,
}: {
  currentExerciseId: string;
  exercises: ActiveExercise[];
  onJump: (exerciseId: string) => void;
}) {
  return (
    <div className={styles.sheetList}>
      {exercises.map((exercise) => {
        const completed = exercise.sets.filter(
          (set) => set.status === "completed",
        ).length;
        const current = exercise.id === currentExerciseId;
        return (
          <button
            aria-current={current ? "true" : undefined}
            className={current ? styles.sheetCurrent : ""}
            key={exercise.id}
            onClick={() => onJump(exercise.id)}
            type="button"
          >
            <span aria-hidden="true" className={styles.sheetStatus}>
              {exercise.status === "completed" ? (
                <CheckIcon size={15} weight="bold" />
              ) : exercise.status === "skipped" ? (
                <MinusIcon size={15} weight="bold" />
              ) : current ? (
                <CircleIcon size={8} weight="fill" />
              ) : null}
            </span>
            <span>
              <strong>{exercise.name}</strong>
              {current && <small>Current exercise</small>}
            </span>
            <b>
              {exercise.status === "skipped"
                ? "Skipped"
                : `${completed}/${exercise.sets.length}`}
            </b>
          </button>
        );
      })}
    </div>
  );
}

function ReplacementList({
  catalog,
  exercise,
  onPick,
  session,
}: {
  catalog: SwapExerciseOption[];
  exercise: ActiveExercise;
  onPick: (exerciseId: string) => void;
  session: ActiveSession;
}) {
  const [search, setSearch] = useState("");
  const available = catalog.filter(
    (option) =>
      option.id !== exercise.exerciseId &&
      !session.exercises.some((item) => item.exerciseId === option.id),
  );
  const groups = groupExercises(filterExercises(available, search, "all"));
  return (
    <>
      <label className={styles.sheetSearch}>
        <MagnifyingGlassIcon aria-hidden="true" size={18} />
        <input
          aria-label="Search exercises"
          autoComplete="off"
          enterKeyHint="search"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search exercises"
          type="search"
          value={search}
        />
      </label>
      <div className={styles.sheetList}>
        {groups.length === 0 && (
          <p className={styles.sheetEmpty}>
            No exercises match “{search.trim()}”.
          </p>
        )}
        {groups.map((group) => (
          <section
            aria-labelledby={`replace-group-${group.key}`}
            className={styles.sheetGroup}
            key={group.key}
          >
            <h3 id={`replace-group-${group.key}`}>{group.label}</h3>
            {group.exercises.map((option) => (
              <button
                key={option.id}
                onClick={() => onPick(option.id)}
                type="button"
              >
                <span aria-hidden="true" />
                <span>
                  <strong>{option.name}</strong>
                  <small>{trackingLabel(option.trackingType)}</small>
                </span>
                <CaretRightIcon aria-hidden="true" size={16} weight="bold" />
              </button>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}
function hasOpenSets(exercise: ActiveExercise) {
  return (
    exercise.status !== "skipped" &&
    exercise.sets.some((set) => set.status === "planned")
  );
}
function previousSetLabel(
  exercise: ActiveExercise,
  position: number,
  unitSystem: UnitSystem,
) {
  if (exercise.previous.reps.length === 0) return "none yet";
  const reps = exercise.previous.reps[position];
  const load = formatSetLoad(
    exercise.trackingType,
    exercise.previous.loadKg,
    unitSystem,
  );
  return load ? `${load} × ${reps ?? "—"} reps` : `${reps ?? "—"} reps`;
}
function setName(set: ActiveExercise["sets"][number], targetSets: number) {
  return set.isPlanned
    ? `Set ${set.position + 1} of ${targetSets}`
    : `Extra set ${Math.max(1, set.position - targetSets + 1)}`;
}
function minutesSince(startedAt: string) {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(startedAt).getTime()) / 60_000),
  );
}
