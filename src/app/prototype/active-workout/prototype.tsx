"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "./prototype.module.css";

// Four variants of the active workout, switchable via ?variant=, on /prototype/active-workout.
type Key = "A" | "B" | "C" | "D";
type Entry = { weight: string; reps: string; complete: boolean };
type Actions = {
  sets: Entry[];
  update: (index: number, field: "weight" | "reps", value: string) => void;
  toggle: (index: number) => void;
  add: () => void;
  remove: (index: number) => void;
  finish: () => void;
};

const variants: { key: Key; name: string }[] = [
  { key: "A", name: "Performance ledger" },
  { key: "B", name: "One-set focus" },
  { key: "C", name: "Compact console" },
  { key: "D", name: "Focused set + exercise sheet" },
];
const seed: Entry[] = [
  { weight: "80", reps: "8", complete: true },
  { weight: "80", reps: "8", complete: true },
  { weight: "80", reps: "", complete: false },
];
const previous = [8, 8, 7];

export function ActiveWorkoutPrototype() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requested = params.get("variant")?.toUpperCase();
  const variant: Key = requested === "B" || requested === "C" || requested === "D" ? requested : "A";
  const [sets, setSets] = useState(seed);
  const [finished, setFinished] = useState(false);

  const cycle = (direction: -1 | 1) => {
    const index = variants.findIndex((item) => item.key === variant);
    const next = variants[(index + direction + variants.length) % variants.length];
    router.replace(`${pathname}?variant=${next.key}`, { scroll: false });
  };

  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).matches("input, textarea, [contenteditable='true']")) return;
      if (event.key === "ArrowLeft") cycle(-1);
      if (event.key === "ArrowRight") cycle(1);
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  });

  const actions: Actions = {
    sets,
    update: (index, field, value) => setSets((current) => current.map((set, i) => i === index ? { ...set, [field]: value, ...(field === "reps" ? { complete: false } : {}) } : set)),
    toggle: (index) => setSets((current) => current.map((set, i) => i === index && set.weight && set.reps ? { ...set, complete: !set.complete } : set)),
    add: () => setSets((current) => [...current, { weight: current.at(-1)?.weight ?? "80", reps: "", complete: false }]),
    remove: (index) => setSets((current) => current.filter((_, i) => i !== index)),
    finish: () => setFinished(true),
  };
  const reps = sets.filter((set) => set.complete).map((set) => Number(set.reps));
  const delta = reps.reduce((sum, value) => sum + value, 0) - previous.slice(0, reps.length).reduce((sum, value) => sum + value, 0);

  if (finished) return <Summary reps={reps} delta={delta} restart={() => { setSets(seed.map((set) => ({ ...set, reps: "", complete: false }))); setFinished(false); }} />;

  return <main className={styles.shell}>
    {variant === "A" && <Ledger actions={actions} />}
    {variant === "B" && <Focus actions={actions} />}
    {variant === "C" && <Console actions={actions} />}
    {variant === "D" && <FocusedSheet actions={actions} />}
    {process.env.NODE_ENV !== "production" && <nav className={styles.switcher} aria-label="Prototype variants">
      <button onClick={() => cycle(-1)} aria-label="Previous variant">←</button>
      <span>{variant} · {variants.find((item) => item.key === variant)?.name}</span>
      <button onClick={() => cycle(1)} aria-label="Next variant">→</button>
    </nav>}
  </main>;
}

const workoutExercises = [
  { name: "Bench Press", sets: 3, status: "current" },
  { name: "Chest-supported Row", sets: 3, status: "upcoming" },
  { name: "Incline Dumbbell Press", sets: 3, status: "upcoming" },
  { name: "Lat Pulldown", sets: 3, status: "upcoming" },
  { name: "Face Pulls", sets: 3, status: "skipped" },
  { name: "Triceps Pushdown", sets: 2, status: "upcoming" },
] as const;

function FocusedSheet({ actions }: { actions: Actions }) {
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const exercise = workoutExercises[exerciseIndex];
  const openSet = actions.sets.findIndex((set) => !set.complete);
  const setIndex = openSet < 0 ? actions.sets.length - 1 : openSet;
  const currentSet = actions.sets[setIndex];
  const completedCount = actions.sets.filter((set) => set.complete).length;
  const nextExercise = workoutExercises[(exerciseIndex + 1) % workoutExercises.length];

  useEffect(() => {
    if (!sheetOpen) return;
    closeRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheetOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [sheetOpen]);

  const closeSheet = () => {
    setSheetOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const chooseExercise = (index: number) => {
    setExerciseIndex(index);
    closeSheet();
  };

  return <section className={`${styles.phone} ${styles.focusedSheet}`}>
    <header className={styles.focusedTop}>
      <button aria-label="Close workout">‹</button>
      <div><b>Upper A</b><span>18:42</span></div>
      <button onClick={actions.finish}>Finish</button>
    </header>

    <div className={styles.focusedBody}>
      <button
        className={styles.exercisePicker}
        onClick={() => setSheetOpen(true)}
        ref={triggerRef}
        type="button"
      >
        <span>Exercise {exerciseIndex + 1} of {workoutExercises.length}</span>
        <strong>{exercise.name}</strong>
        <i aria-hidden="true">⌄</i>
      </button>

      <section className={styles.setFocus}>
        <div className={styles.setHeading}>
          <div><span>Current set</span><strong>Set {setIndex + 1} of {actions.sets.length}</strong></div>
          <small>{completedCount} completed</small>
        </div>
        <p className={styles.previousSet}>Previous: <b>80 kg × {previous[setIndex] ?? 8} reps</b></p>
        <div className={styles.focusedInputs}>
          <label><span>Weight</span><div><input aria-label="Weight" inputMode="decimal" value={currentSet.weight} onChange={(event) => actions.update(setIndex, "weight", event.target.value)} /><small>kg</small></div></label>
          <label><span>Reps</span><input aria-label="Reps" inputMode="numeric" placeholder="0" value={currentSet.reps} onChange={(event) => actions.update(setIndex, "reps", event.target.value)} /></label>
        </div>
        <button className={styles.completeFocused} onClick={() => actions.toggle(setIndex)} type="button">
          {currentSet.complete ? "Reopen set" : "Complete set"}
        </button>
      </section>

      <div className={styles.setProgress} aria-label={`${completedCount} of ${actions.sets.length} sets completed`}>
        {actions.sets.map((set, index) => <span className={set.complete ? styles.setProgressDone : index === setIndex ? styles.setProgressCurrent : ""} key={index}>{set.complete ? "✓" : index + 1}</span>)}
      </div>

      <button className={styles.continueExercise} onClick={() => setExerciseIndex((current) => (current + 1) % workoutExercises.length)} type="button">
        <span>Up next</span><strong>{nextExercise.name}</strong><i aria-hidden="true">›</i>
      </button>
    </div>

    {sheetOpen && <div className={styles.sheetLayer}>
      <button className={styles.scrim} aria-label="Close exercise list" onClick={closeSheet} />
      <section aria-labelledby="exercise-sheet-title" aria-modal="true" className={styles.exerciseSheet} role="dialog">
        <div className={styles.sheetGrabber} aria-hidden="true" />
        <header><h2 id="exercise-sheet-title">Exercises</h2><button onClick={closeSheet} ref={closeRef}>Done</button></header>
        <div className={styles.sheetList}>
          {workoutExercises.map((item, index) => {
            const isCurrent = index === exerciseIndex;
            const isComplete = index < exerciseIndex;
            return <button className={isCurrent ? styles.sheetCurrent : ""} key={item.name} onClick={() => chooseExercise(index)} type="button">
              <span className={styles.sheetStatus} aria-hidden="true">{isComplete ? "✓" : item.status === "skipped" ? "—" : isCurrent ? "●" : ""}</span>
              <span><strong>{item.name}</strong>{isCurrent && <small>Current exercise</small>}</span>
              <b>{isComplete ? `${item.sets}/${item.sets}` : item.status === "skipped" ? "Skipped" : isCurrent ? `${completedCount}/${actions.sets.length}` : `0/${item.sets}`}</b>
            </button>;
          })}
        </div>
        <button className={styles.addToday} type="button">＋ Add exercise for today</button>
      </section>
    </div>}
  </section>;
}

function Row({ set, index, actions, compact = false }: { set: Entry; index: number; actions: Actions; compact?: boolean }) {
  return <div className={`${styles.row} ${set.complete ? styles.done : ""} ${compact ? styles.compact : ""}`}>
    <span className={styles.number}>{index + 1}</span>
    <label><span>kg</span><input aria-label={`Set ${index + 1} weight`} inputMode="decimal" value={set.weight} onChange={(event) => actions.update(index, "weight", event.target.value)} /></label>
    <i>×</i>
    <label><span>reps</span><input aria-label={`Set ${index + 1} reps`} inputMode="numeric" placeholder="—" value={set.reps} onChange={(event) => actions.update(index, "reps", event.target.value)} /></label>
    <button className={styles.check} onClick={() => actions.toggle(index)} aria-label={`Complete set ${index + 1}`}>{set.complete ? "✓" : "○"}</button>
    {!compact && <button className={styles.remove} onClick={() => actions.remove(index)} aria-label={`Remove set ${index + 1}`}>×</button>}
  </div>;
}

function Ledger({ actions }: { actions: Actions }) {
  return <section className={`${styles.phone} ${styles.ledger}`}>
    <header className={styles.top}><div><b>OVERMASTERY</b><small>Upper A · 18 min</small></div><button onClick={actions.finish}>Finish</button></header>
    <div className={styles.title}><p>01 / 06</p><h1>Bench Press</h1><span>Barbell · Chest</span></div>
    <div className={styles.compare}><div><span>Previous</span><strong>8 / 8 / 7</strong></div><div><span>Today&apos;s line</span><strong>8 / 8 / 8</strong></div></div>
    <div className={styles.rows}>{actions.sets.map((set, index) => <Row key={index} set={set} index={index} actions={actions} />)}<button className={styles.add} onClick={actions.add}>+ Add set</button></div>
    <footer className={styles.exerciseNav}><button>← Row</button><span>Bench Press</span><button>Incline DB →</button></footer>
  </section>;
}

function Focus({ actions }: { actions: Actions }) {
  const open = actions.sets.findIndex((set) => !set.complete);
  const index = open < 0 ? actions.sets.length - 1 : open;
  const set = actions.sets[index];
  return <section className={`${styles.phone} ${styles.focus}`}>
    <header className={styles.focusTop}><button>⌄</button><span>Bench Press · Set {index + 1} of {actions.sets.length}</span><button onClick={actions.finish}>End</button></header>
    <div className={styles.beat}><p>Beat this set</p><strong>80 <small>kg</small> × 8 <small>reps</small></strong><span>Previous set {index + 1}: {previous[index] ?? "—"} reps</span></div>
    <div className={styles.entry}><label><span>Weight</span><input inputMode="decimal" value={set.weight} onChange={(event) => actions.update(index, "weight", event.target.value)} /><small>kg</small></label><label><span>Reps</span><input inputMode="numeric" placeholder="0" value={set.reps} onChange={(event) => actions.update(index, "reps", event.target.value)} /></label><button onClick={() => actions.toggle(index)}>Complete set</button></div>
    <div className={styles.dots}>{actions.sets.map((item, i) => <span key={i} className={item.complete ? styles.dotDone : i === index ? styles.dotOpen : ""}>{i + 1}</span>)}</div>
    <aside className={styles.upNext}><span>Up next</span><strong>Chest Supported Row</strong><small>70 kg · Previous 10 / 10 / 9</small></aside>
  </section>;
}

function Console({ actions }: { actions: Actions }) {
  return <section className={`${styles.phone} ${styles.console}`}>
    <header className={styles.consoleTop}><div><b>UPPER A</b><span>18:42</span></div><button onClick={actions.finish}>Finish session</button></header>
    <div className={styles.consoleTitle}><div><p>Exercise 1 of 6</p><h1>Bench Press</h1></div><button>•••</button></div>
    <div className={styles.consoleCompare}><div><span>LAST</span><b>80 kg</b><strong>8 · 8 · 7</strong></div><i>→</i><div><span>TODAY</span><b>80 kg</b><strong>{actions.sets.map((set) => set.reps || "–").join(" · ")}</strong></div></div>
    <div className={styles.consoleRows}>{actions.sets.map((set, index) => <Row key={index} set={set} index={index} actions={actions} compact />)}<button className={styles.add} onClick={actions.add}>Add working set</button></div>
    <aside className={styles.note}><span>Target</span><p>One more rep on set 3 matches today&apos;s line.</p></aside>
    <nav className={styles.tabs}><button className={styles.active}>Train</button><button>Exercises</button><button>Session</button></nav>
  </section>;
}

function Summary({ reps, delta, restart }: { reps: number[]; delta: number; restart: () => void }) {
  return <main className={styles.summary}><div className={styles.mark}>+{Math.max(0, delta)}</div><p>UPPER A COMPLETE</p><h1>{delta > 0 ? "You moved the line." : delta === 0 ? "Performance matched." : "Session recorded."}</h1><p className={styles.copy}>{delta > 0 ? `${delta} more completed reps than your previous Bench Press exposure.` : "One session is data, not a verdict. Your next target stays close."}</p><div className={styles.result}><span>Bench Press</span><strong>{reps.join(" / ") || "No completed sets"}</strong><small>Previous · {previous.join(" / ")}</small></div><button className={styles.restart} onClick={restart}>Start next exposure</button></main>;
}
