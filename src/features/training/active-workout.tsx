"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./active-workout.module.css";
import {
  comparePerformance,
  formatPerformance,
  formatWeight,
  performanceFromSets,
  type ExercisePerformance,
  type SetEntry,
  type TrainingSession,
} from "./model";
import { createSeedSession } from "./seed";

type Screen = "home" | "lifts" | "training" | "progress" | "profile" | "summary";

export function OvermasteryApp() {
  const [session, setSession] = useState<TrainingSession>(() => createSeedSession());
  const [screen, setScreen] = useState<Screen>("home");
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [previousOverrides, setPreviousOverrides] = useState<Record<string, ExercisePerformance>>({});
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  useEffect(() => {
    if (screen !== "training") return;
    const update = () => setElapsedMinutes(Math.floor((Date.now() - session.startedAt) / 60_000));
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, [screen, session.startedAt]);

  const completedSets = session.exercises.reduce((count, exercise) => count + exercise.sets.filter((set) => set.completed).length, 0);

  const updateSets = (sets: SetEntry[]) => {
    setSession((current) => ({ ...current, exercises: current.exercises.map((exercise, index) => index === exerciseIndex ? { ...exercise, sets } : exercise) }));
  };

  const finish = () => {
    if (completedSets === 0) return;
    setScreen("summary");
  };

  const startNext = () => {
    const nextPrevious = { ...previousOverrides };
    session.exercises.forEach((exercise) => {
      const performance = performanceFromSets(exercise.sets);
      if (performance) nextPrevious[exercise.exerciseId] = performance;
    });
    setPreviousOverrides(nextPrevious);
    setSession(createSeedSession(nextPrevious));
    setExerciseIndex(0);
    setElapsedMinutes(0);
    setScreen("home");
  };

  return <main className={styles.app}>
    {screen === "home" && <Home session={session} completedSets={completedSets} onStart={() => setScreen("training")} />}
    {screen === "training" && <Workout session={session} exerciseIndex={exerciseIndex} elapsedMinutes={elapsedMinutes} updateSets={updateSets} move={setExerciseIndex} finish={finish} />}
    {screen === "summary" && <Summary session={session} elapsedMinutes={elapsedMinutes} onNext={startNext} />}
    {screen === "lifts" && <Workspace eyebrow="Lifts" title="Your training library." copy="Exercises, custom movements, and workout templates will live here." />}
    {screen === "progress" && <Workspace eyebrow="Progress" title="What moved forward." copy="Exercise history and factual progression summaries will live here." />}
    {screen === "profile" && <Workspace eyebrow="Profile" title="Make it yours." copy="Account, units, defaults, and training preferences will live here." />}
    {screen !== "summary" && <AppNav screen={screen} navigate={setScreen} />}
  </main>;
}

function Home({ session, completedSets, onStart }: { session: TrainingSession; completedSets: number; onStart: () => void }) {
  return <section className={styles.today}>
    <header className={styles.brandBar}><strong>OVERMASTERY</strong><button aria-label="Open profile">VO</button></header>
    <div className={styles.todayLead}><p>Home</p><h1>{completedSets ? "Your session is waiting." : "Choose what to train."}</h1><span>{completedSets ? `${completedSets} completed ${completedSets === 1 ? "set" : "sets"} saved in this session.` : "Start from any workout template. No schedule is assumed."}</span></div>
    <article className={styles.sessionCard}>
      <div className={styles.sessionMeta}><span>{completedSets ? "Active session" : "Workout template"}</span><small>{session.exercises.length} exercises</small></div>
      <h2>{session.templateName}</h2>
      <ol>{session.exercises.map((exercise) => <li key={exercise.id}><span>{exercise.name}</span><small>{formatWeight(exercise.previous.weightKg)} kg · {formatPerformance(exercise.previous)}</small></li>)}</ol>
      <button onClick={onStart}>{completedSets ? "Resume workout" : `Start ${session.templateName}`}<span>→</span></button>
    </article>
  </section>;
}

function Workout({ session, exerciseIndex, elapsedMinutes, updateSets, move, finish }: { session: TrainingSession; exerciseIndex: number; elapsedMinutes: number; updateSets: (sets: SetEntry[]) => void; move: (index: number) => void; finish: () => void }) {
  const exercise = session.exercises[exerciseIndex];
  const activeIndexRaw = exercise.sets.findIndex((set) => !set.completed);
  const activeIndex = activeIndexRaw < 0 ? exercise.sets.length - 1 : activeIndexRaw;
  const activeSet = exercise.sets[activeIndex];
  const current = performanceFromSets(exercise.sets);
  const comparison = comparePerformance(current, exercise.previous);

  const update = (index: number, field: "weightKg" | "reps", value: string) => updateSets(exercise.sets.map((set, setIndex) => setIndex === index ? { ...set, [field]: value, ...(field === "reps" ? { completed: false } : {}) } : set));
  const toggle = (index: number) => updateSets(exercise.sets.map((set, setIndex) => setIndex === index && set.weightKg && set.reps ? { ...set, completed: !set.completed } : set));
  const add = () => updateSets([...exercise.sets, { id: `${exercise.id}-set-${exercise.sets.length + 1}`, weightKg: activeSet?.weightKg ?? String(exercise.previous.weightKg), reps: "", completed: false }]);
  const remove = (index: number) => exercise.sets.length > 1 && updateSets(exercise.sets.filter((_, setIndex) => setIndex !== index));
  const jumpTo = (index: number) => {
    move(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const completedForExercise = exercise.sets.filter((set) => set.completed).length;

  return <section className={styles.workout}>
    <header className={styles.workoutBar}>
      <div className={styles.stickyIdentity}><span>{session.templateName.toUpperCase()} · {elapsedMinutes} min</span><strong>{exercise.name}</strong></div>
      <div className={styles.stickyProgress}><span>{completedForExercise} / {exercise.sets.length} sets</span><small>{formatWeight(exercise.target.weightKg)} kg · {formatPerformance(exercise.target)}</small></div>
      <button onClick={finish} disabled={session.exercises.every((item) => item.sets.every((set) => !set.completed))}>Finish</button>
    </header>
    <div className={styles.exerciseTitle}><div><p>Exercise {exerciseIndex + 1} of {session.exercises.length}</p><h1>{exercise.name}</h1><span>{exercise.detail}</span></div><button aria-label="Exercise options">•••</button></div>
    <div className={styles.performanceRail}>
      <div><span>Previous</span><strong>{formatPerformance(exercise.previous)}</strong><small>{formatWeight(exercise.previous.weightKg)} kg</small></div>
      <i>→</i>
      <div><span>Today&apos;s line</span><strong>{formatPerformance(exercise.target)}</strong><small>{formatWeight(exercise.target.weightKg)} kg</small></div>
      <div className={styles.live}><span>Today</span><strong>{exercise.sets.map((set) => set.completed ? set.reps : "–").join(" / ")}</strong><small className={styles[comparison.state]}>{comparison.label}</small></div>
    </div>
    <div className={styles.setStack}>
      {exercise.sets.map((set, index) => set.completed && <CompletedRow key={set.id} set={set} index={index} edit={() => toggle(index)} />)}
      {activeSet && !activeSet.completed && <div className={styles.activeSet}>
        <div className={styles.activeSetLabel}><span>Set {activeIndex + 1}</span><small>Previous: {exercise.previous.reps[activeIndex] ?? "—"} reps</small></div>
        <div className={styles.activeInputs}><label><span>Weight</span><div><input aria-label="Active set weight" inputMode="decimal" value={activeSet.weightKg} onChange={(event) => update(activeIndex, "weightKg", event.target.value)} /><small>kg</small></div></label><label><span>Reps</span><input aria-label="Active set reps" inputMode="numeric" placeholder="0" value={activeSet.reps} onChange={(event) => update(activeIndex, "reps", event.target.value)} /></label></div>
        <button className={styles.completeSet} disabled={!activeSet.weightKg || !activeSet.reps} onClick={() => toggle(activeIndex)}>Complete set <span>✓</span></button>
        <button className={styles.removeSet} onClick={() => remove(activeIndex)}>Remove set</button>
      </div>}
      {activeIndexRaw < 0 && <div className={styles.exerciseDone}><span>Exercise complete</span><strong>{comparison.label}</strong></div>}
      <button className={styles.addSet} onClick={add}>+ Add working set</button>
      <ExerciseOverview session={session} currentIndex={exerciseIndex} jumpTo={jumpTo} />
    </div>
  </section>;
}

function ExerciseOverview({ session, currentIndex, jumpTo }: { session: TrainingSession; currentIndex: number; jumpTo: (index: number) => void }) {
  return <section className={styles.exerciseOverview}>
    <header><div><span>Session exercises</span><strong>{session.exercises.filter((exercise) => exercise.sets.every((set) => set.completed)).length} / {session.exercises.length} complete</strong></div><small>Tap any exercise to jump</small></header>
    <div className={styles.exerciseGrid}>{session.exercises.map((exercise, index) => {
      const done = exercise.sets.every((set) => set.completed);
      const touched = exercise.sets.some((set) => set.completed || set.reps);
      const weight = exercise.sets.find((set) => set.weightKg)?.weightKg ?? formatWeight(exercise.previous.weightKg);
      const reps = exercise.sets.map((set) => set.completed ? set.reps : "–").join(" / ");
      return <button key={exercise.id} className={`${styles.exerciseTile} ${index === currentIndex ? styles.currentTile : ""} ${done ? styles.completeTile : ""}`} onClick={() => jumpTo(index)}>
        <span className={styles.tileOrder}>{String(index + 1).padStart(2, "0")}</span>
        <strong>{exercise.name}</strong>
        <small>{weight} kg</small>
        <b>{touched ? reps : exercise.sets.map(() => "–").join(" / ")}</b>
        {done && <i aria-label="Complete">✓</i>}
      </button>;
    })}</div>
  </section>;
}

function CompletedRow({ set, index, edit }: { set: SetEntry; index: number; edit: () => void }) {
  return <button className={styles.completedRow} onClick={edit}><span className={styles.completedCheck}>✓</span><span>Set {index + 1}</span><strong>{set.weightKg} kg × {set.reps}</strong><small>Edit</small></button>;
}

function Summary({ session, elapsedMinutes, onNext }: { session: TrainingSession; elapsedMinutes: number; onNext: () => void }) {
  const results = useMemo(() => session.exercises.map((exercise) => ({ exercise, performance: performanceFromSets(exercise.sets), comparison: comparePerformance(performanceFromSets(exercise.sets), exercise.previous) })), [session]);
  const improved = results.filter((result) => result.comparison.state === "improved").length;
  return <section className={styles.summary}>
    <header><strong>SESSION COMPLETE</strong><span>{session.templateName} · {elapsedMinutes} min</span></header>
    <div className={styles.summaryLead}><div>{improved}</div><p>{improved === 1 ? "exercise moved forward" : "exercises moved forward"}</p><h1>{improved ? "The work showed up in the numbers." : "Session recorded. Keep building."}</h1></div>
    <div className={styles.results}>{results.map(({ exercise, performance, comparison }) => <article key={exercise.id}><div><h2>{exercise.name}</h2><span>{performance ? `${formatWeight(performance.weightKg)} kg · ${formatPerformance(performance)}` : "Skipped"}</span></div><strong className={styles[comparison.state]}>{comparison.label}</strong></article>)}</div>
    <button className={styles.nextExposure} onClick={onNext}>Use this as next time&apos;s previous <span>→</span></button>
  </section>;
}

function Workspace({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <section className={styles.workspace}><header className={styles.brandBar}><strong>OVERMASTERY</strong><button aria-label="Open profile">VO</button></header><div><p>{eyebrow}</p><h1>{title}</h1><span>{copy}</span></div><article><strong>Foundation first</strong><p>This destination is represented in navigation now. Its full workflow comes after active-session behavior and persistence are validated.</p></article></section>;
}

function AppNav({ screen, navigate }: { screen: Screen; navigate: (screen: Screen) => void }) {
  const items: { key: Exclude<Screen, "summary">; label: string; icon: string }[] = [
    { key: "home", label: "Home", icon: "○" },
    { key: "lifts", label: "Lifts", icon: "≡" },
    { key: "training", label: "Train", icon: "↑" },
    { key: "progress", label: "Progress", icon: "↗" },
    { key: "profile", label: "Profile", icon: "●" },
  ];
  return <nav className={styles.appNav} aria-label="Primary navigation">{items.map((item) => <button key={item.key} className={`${screen === item.key ? styles.navActive : ""} ${item.key === "training" ? styles.trainNav : ""}`} onClick={() => navigate(item.key)} aria-current={screen === item.key ? "page" : undefined}><span>{item.icon}</span><small>{item.label}</small></button>)}</nav>;
}
