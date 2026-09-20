"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  ArrowLeftIcon,
  CaretDownIcon,
  CaretRightIcon,
  CheckIcon,
  CircleIcon,
  DotsThreeIcon,
  MinusIcon,
} from "@phosphor-icons/react";

import {
  addExtraSet,
  completeSet,
  finishSession,
  removeWorkingSet,
  reopenSet,
  restoreMissingPlannedSet,
  restoreSkippedSet,
  skipExercise,
  swapExercise,
} from "./actions";
import { formatDisplayLoad, loadUnit, toDisplayLoad, toKilograms, type UnitSystem } from "@/lib/units";
import { scrollToPageTop } from "@/lib/motion";
import { SelectField } from "@/features/ui/select-field";
import { canAddExtraSet, planOutcomeLabel, projectSetPlan, removalActionLabel } from "./set-policy";
import styles from "./active-session.module.css";
import type { ActiveExercise, ActiveSession, SessionMutationResult, SwapExerciseOption } from "./types";

type Mutate = (action: () => Promise<SessionMutationResult>, afterSuccess?: () => void) => void;

export function ActiveSessionScreen({ catalog, session, unitSystem }: { dayEndsAt: string; catalog: SwapExerciseOption[]; session: ActiveSession; unitSystem: UnitSystem }) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [currentExerciseId, setCurrentExerciseId] = useState(session.exercises.find((exercise) => exercise.status !== "skipped")?.id ?? session.exercises[0]?.id);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [elapsedMinutes, setElapsedMinutes] = useState(() => minutesSince(session.startedAt));
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const timer = window.setInterval(() => setElapsedMinutes(minutesSince(session.startedAt)), 30_000);
    return () => window.clearInterval(timer);
  }, [session.startedAt]);

  const closeSheet = () => {
    setSheetOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  useEffect(() => {
    if (!sheetOpen) return;
    closeRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") closeSheet(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [sheetOpen]);

  const currentExercise = session.exercises.find((exercise) => exercise.id === currentExerciseId) ?? session.exercises[0];
  const completedSets = session.exercises.reduce((count, exercise) => count + exercise.sets.filter((set) => set.status === "completed").length, 0);
  const mutate: Mutate = (action, afterSuccess) => {
    startTransition(async () => {
      setMessage(null);
      const result = await action();
      if (!result.ok) { setMessage(result.message ?? "That change could not be saved. Try again."); return; }
      afterSuccess?.();
      router.refresh();
    });
  };

  if (!currentExercise) return null;
  const currentIndex = session.exercises.findIndex((exercise) => exercise.id === currentExercise.id);
  const nextExercise = [...session.exercises.slice(currentIndex + 1), ...session.exercises.slice(0, currentIndex)].find((exercise) => exercise.status !== "skipped");
  const jumpTo = (exerciseId: string) => { setCurrentExerciseId(exerciseId); setSheetOpen(false); scrollToPageTop(); window.requestAnimationFrame(() => triggerRef.current?.focus()); };
  const moveAfterSkip = () => { if (nextExercise) setCurrentExerciseId(nextExercise.id); };

  return <main className={styles.page}><section className={styles.shell}>
    <header className={styles.stickyHeader} inert={sheetOpen ? true : undefined}>
      <Link aria-label="Leave active workout" href="/"><ArrowLeftIcon aria-hidden="true" size={22} weight="bold" /></Link>
      <div><strong>{session.templateName}</strong><span>{elapsedMinutes} min</span></div>
      <button disabled={pending || completedSets === 0} onClick={() => mutate(() => finishSession(session.id))} type="button">Finish</button>
    </header>
    {message && <div className={styles.errorBanner} role="alert">{message}</div>}
    <div className={styles.content} inert={sheetOpen ? true : undefined}>
      <button className={styles.exercisePicker} onClick={() => setSheetOpen(true)} ref={triggerRef} type="button">
        <span>Exercise {currentExercise.position + 1} of {session.exercises.length}</span><strong>{currentExercise.name}</strong><small>{trackingLabel(currentExercise.trackingType)}</small><i aria-hidden="true"><CaretDownIcon size={22} weight="bold" /></i>
      </button>
      <ExerciseOptions catalog={catalog} exercise={currentExercise} moveAfterSkip={moveAfterSkip} mutate={mutate} pending={pending} session={session} />
      <FocusedSet exercise={currentExercise} mutate={mutate} pending={pending} sessionId={session.id} unitSystem={unitSystem} />
      <SetProgress exercise={currentExercise} mutate={mutate} pending={pending} sessionId={session.id} />
      {nextExercise && nextExercise.id !== currentExercise.id && <button className={styles.upNext} onClick={() => jumpTo(nextExercise.id)} type="button"><span>Up next</span><strong>{nextExercise.name}</strong><i aria-hidden="true"><CaretRightIcon size={24} weight="bold" /></i></button>}
    </div>
    {sheetOpen && <ExerciseSheet closeRef={closeRef} currentExerciseId={currentExercise.id} exercises={session.exercises} onClose={closeSheet} onJump={jumpTo} />}
  </section></main>;
}

function ExerciseOptions({ catalog, exercise, moveAfterSkip, mutate, pending, session }: { catalog: SwapExerciseOption[]; exercise: ActiveExercise; moveAfterSkip: () => void; mutate: Mutate; pending: boolean; session: ActiveSession }) {
  const [replacementId, setReplacementId] = useState("");
  const canChange = !exercise.sets.some((set) => set.status === "completed");
  const options = catalog.filter((option) => option.id !== exercise.exerciseId && !session.exercises.some((item) => item.exerciseId === option.id));
  return <details className={styles.exerciseMenu}><summary aria-label={`Options for ${exercise.name}`}><DotsThreeIcon aria-hidden="true" size={22} weight="bold" /></summary><div>
    <strong>Change today only</strong><p>Your saved workout remains unchanged.</p>
    <SelectField
      ariaLabel="Replacement exercise"
      disabled={!canChange || pending}
      onValueChange={setReplacementId}
      options={[{ label: "Choose replacement", value: "" }, ...options.map((option) => ({ label: option.name, value: option.id }))]}
      value={replacementId}
    />
    <button className={styles.menuAction} disabled={!canChange || pending || !replacementId} onClick={() => mutate(() => swapExercise({ replacementExerciseId: replacementId, sessionExerciseId: exercise.id, sessionId: session.id }))} type="button">Swap exercise</button>
    <button className={styles.skipButton} disabled={!canChange || pending} onClick={() => mutate(() => skipExercise({ sessionExerciseId: exercise.id, sessionId: session.id }), moveAfterSkip)} type="button">Skip exercise</button>
    {!canChange && <small>Reopen logged sets before changing this exercise.</small>}
  </div></details>;
}

function FocusedSet({ exercise, mutate, pending, sessionId, unitSystem }: { exercise: ActiveExercise; mutate: Mutate; pending: boolean; sessionId: string; unitSystem: UnitSystem }) {
  const activeSet = exercise.sets.find((set) => set.status === "planned");
  const completedCount = exercise.sets.filter((set) => set.status === "completed").length;
  const plan = projectSetPlan(exercise.sets, exercise.targetSets);
  if (exercise.status === "skipped") return <div className={styles.statusCard}><span>Skipped today</span><p>Choose another exercise to continue training.</p></div>;
  if (!activeSet) return <div className={styles.statusCard}><span>Exercise complete</span><strong>{planOutcomeLabel(plan)}</strong></div>;
  return <ActiveSetEditor completedCount={completedCount} exercise={exercise} key={activeSet.id} mutate={mutate} pending={pending} sessionId={sessionId} set={activeSet} unitSystem={unitSystem} />;
}

function ActiveSetEditor({ completedCount, exercise, mutate, pending, sessionId, set, unitSystem }: { completedCount: number; exercise: ActiveExercise; mutate: Mutate; pending: boolean; sessionId: string; set: ActiveExercise["sets"][number]; unitSystem: UnitSystem }) {
  const previousLoad = exercise.previous.loadKg;
  const [load, setLoad] = useState(set.loadKg === null ? previousLoad === null ? "" : String(toDisplayLoad(previousLoad, unitSystem)) : String(toDisplayLoad(set.loadKg, unitSystem)));
  const [reps, setReps] = useState(set.reps === null ? "" : String(set.reps));
  const loadRequired = exercise.trackingType !== "bodyweight_reps";
  const canComplete = reps !== "" && (!loadRequired || (load !== "" && Number(load) >= 0));
  return <section className={styles.activeSet}>
    <header><div><span>Current set</span><strong>{setName(set, exercise.targetSets)}</strong></div><small>{completedCount} completed</small></header>
    <p className={styles.previousSet}>Previous: <strong>{previousSetLabel(exercise, set.position, unitSystem)}</strong></p>
    <div className={styles.setInputs}>
      {loadRequired ? <label><span>{loadLabel(exercise.trackingType)}</span><div><input aria-label={loadLabel(exercise.trackingType)} inputMode="decimal" min="0" onChange={(event) => setLoad(event.target.value)} step={unitSystem === "imperial" ? "0.5" : "0.25"} type="number" value={load} /><small>{loadUnit(unitSystem)}</small></div></label> : <div className={styles.bodyweightField}><span>Load</span><strong>Bodyweight</strong></div>}
      <label><span>Reps</span><input aria-label="Reps" inputMode="numeric" min="0" onChange={(event) => setReps(event.target.value)} placeholder="0" type="number" value={reps} /></label>
    </div>
    <button className={styles.completeSet} disabled={pending || !canComplete} onClick={() => mutate(() => completeSet({ loadKg: loadRequired ? toKilograms(Number(load), unitSystem) : null, reps: Number(reps), sessionId, setId: set.id }))} type="button">Complete set</button>
  </section>;
}

function SetProgress({ exercise, mutate, pending, sessionId }: { exercise: ActiveExercise; mutate: Mutate; pending: boolean; sessionId: string }) {
  const canAddExtra = canAddExtraSet(exercise.sets);
  const plan = projectSetPlan(exercise.sets, exercise.targetSets);
  const activeSet = exercise.sets.find((set) => set.status === "planned");
  return <section className={styles.progressSection}>
    <div className={styles.setProgress} aria-label={`${exercise.sets.filter((set) => set.status === "completed").length} sets completed`}>
      {exercise.sets.map((set) => set.status === "completed"
        ? <button aria-label={`Edit ${setName(set, exercise.targetSets)}`} className={styles.progressDone} disabled={pending} key={set.id} onClick={() => mutate(() => reopenSet({ sessionId, setId: set.id }))} type="button"><CheckIcon aria-hidden="true" size={14} weight="bold" /></button>
        : set.status === "skipped"
          ? <button aria-label={`Restore ${setName(set, exercise.targetSets)}`} className={styles.progressSkipped} disabled={pending || !set.isPlanned} key={set.id} onClick={() => mutate(() => restoreSkippedSet({ sessionId, setId: set.id }))} type="button"><MinusIcon aria-hidden="true" size={14} weight="bold" /></button>
          : <span className={set.id === activeSet?.id ? styles.progressCurrent : ""} key={set.id}>{set.position + 1}</span>)}
      {plan.plannedSlots.filter((slot) => slot.synthetic).map((slot) => <button aria-label={`Restore planned set ${slot.position + 1}`} className={styles.progressSkipped} disabled={pending} key={`missing-${slot.position}`} onClick={() => mutate(() => restoreMissingPlannedSet({ position: slot.position, sessionExerciseId: exercise.id, sessionId }))} type="button"><MinusIcon aria-hidden="true" size={14} weight="bold" /></button>)}
    </div>
    {exercise.status !== "skipped" && <details className={styles.setActions}><summary>Set options</summary><div>
      <button disabled={pending || !canAddExtra} onClick={() => mutate(() => addExtraSet({ sessionExerciseId: exercise.id, sessionId }))} type="button">{canAddExtra ? "Add extra set" : "Complete the extra set first"}</button>
      {activeSet && <RemoveSetButton exercise={exercise} mutate={mutate} pending={pending} sessionId={sessionId} set={activeSet} />}
    </div></details>}
  </section>;
}

function RemoveSetButton({ exercise, mutate, pending, sessionId, set }: { exercise: ActiveExercise; mutate: Mutate; pending: boolean; sessionId: string; set: ActiveExercise["sets"][number] }) {
  const nonSkippedSets = exercise.sets.filter((item) => item.status !== "skipped").length;
  return <button disabled={pending || nonSkippedSets <= 1} onClick={() => mutate(() => removeWorkingSet({ sessionId, setId: set.id }))} type="button">{removalActionLabel({ isPlanned: set.isPlanned })}</button>;
}

function ExerciseSheet({ closeRef, currentExerciseId, exercises, onClose, onJump }: { closeRef: React.RefObject<HTMLButtonElement | null>; currentExerciseId: string; exercises: ActiveExercise[]; onClose: () => void; onJump: (exerciseId: string) => void }) {
  return <div className={styles.sheetLayer}><button aria-label="Close exercise list" className={styles.scrim} onClick={onClose} /><section aria-labelledby="exercise-sheet-title" aria-modal="true" className={styles.exerciseSheet} role="dialog">
    <div aria-hidden="true" className={styles.sheetGrabber} /><header><h2 id="exercise-sheet-title">Exercises</h2><button onClick={onClose} ref={closeRef}>Done</button></header>
    <div className={styles.sheetList}>{exercises.map((exercise) => {
      const completed = exercise.sets.filter((set) => set.status === "completed").length;
      const current = exercise.id === currentExerciseId;
      return <button aria-current={current ? "true" : undefined} className={current ? styles.sheetCurrent : ""} key={exercise.id} onClick={() => onJump(exercise.id)} type="button"><span aria-hidden="true" className={styles.sheetStatus}>{exercise.status === "completed" ? <CheckIcon size={15} weight="bold" /> : exercise.status === "skipped" ? <MinusIcon size={15} weight="bold" /> : current ? <CircleIcon size={8} weight="fill" /> : null}</span><span><strong>{exercise.name}</strong>{current && <small>Current exercise</small>}</span><b>{exercise.status === "skipped" ? "Skipped" : `${completed}/${exercise.sets.length}`}</b></button>;
    })}</div>
  </section></div>;
}

function trackingLabel(type: ActiveExercise["trackingType"]) { const labels: Record<ActiveExercise["trackingType"], string> = { added_weight_reps: "Added weight + reps", assistance_reps: "Assistance + reps", bodyweight_reps: "Bodyweight + reps", duration: "Duration", weight_distance: "Weight + distance", weight_duration: "Weight + duration", weight_reps: "Weight + reps" }; return labels[type]; }
function loadLabel(type: ActiveExercise["trackingType"]) { if (type === "assistance_reps") return "Assistance"; if (type === "added_weight_reps") return "Added weight"; return "Weight"; }
function previousSetLabel(exercise: ActiveExercise, position: number, unitSystem: UnitSystem) { const reps = exercise.previous.reps[position]; if (exercise.trackingType === "bodyweight_reps") return `${reps ?? "—"} reps`; return `${formatDisplayLoad(exercise.previous.loadKg, unitSystem)} ${loadUnit(unitSystem)} × ${reps ?? "—"} reps`; }
function setName(set: ActiveExercise["sets"][number], targetSets: number) { return set.isPlanned ? `Set ${set.position + 1} of ${targetSets}` : `Extra set ${Math.max(1, set.position - targetSets + 1)}`; }
function minutesSince(startedAt: string) { return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60_000)); }
