"use client";

import Link from "next/link";
import { useActionState, useMemo, useState, useTransition } from "react";
import { motion, Reorder, useDragControls } from "motion/react";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CaretDownIcon,
  DotsSixVerticalIcon,
  MagnifyingGlassIcon,
  XIcon,
} from "@phosphor-icons/react";

import {
  groupExercises,
  type ExerciseGroup,
} from "@/features/exercises/exercise-filter";
import { recordGuidance } from "@/features/guidance/actions";
import {
  hasSeenGuidance,
  type GuidanceKey,
  type GuidanceOutcome,
  type GuidanceState,
} from "@/features/guidance/model";
import { Collapsible, Disclosure } from "@/features/ui/disclosure";
import { SelectField } from "@/features/ui/select-field";

import {
  archiveWorkout,
  createCustomExercise,
  createWorkout,
  updateWorkout,
  type CreateExerciseState,
  type CreateWorkoutState,
} from "./actions";
import styles from "./create-workout.module.css";
import { trackingLabel, trackingOptions } from "./tracking";

const MotionCaretDown = motion.create(CaretDownIcon);
import type {
  ExerciseCatalogItem,
  WorkoutExerciseDraft,
  WorkoutTemplateDraft,
} from "./types";
import { navBack } from "@/features/navigation/page-transition";

const initialWorkoutState: CreateWorkoutState = {};
const initialExerciseState: CreateExerciseState = {};

type DraftField =
  "defaultRestSeconds" | "targetRepMax" | "targetRepMin" | "targetSets";

/**
 * One exercise in the plan. Drag by the grip to reorder; the list itself
 * stays scrollable because only the handle starts a drag. Drag has no
 * keyboard equivalent, so the expanded settings keep Move earlier/later.
 */
function SelectedExerciseRow({
  exercise,
  expanded,
  index,
  isFirst,
  isLast,
  onMove,
  onRemove,
  onToggle,
  onUpdate,
}: {
  exercise: WorkoutExerciseDraft;
  expanded: boolean;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  onToggle: () => void;
  onUpdate: (field: DraftField, value: number) => void;
}) {
  const dragControls = useDragControls();
  return (
    <Reorder.Item
      as="li"
      className={styles.selectedRow}
      dragControls={dragControls}
      dragListener={false}
      value={exercise}
      whileDrag={{
        boxShadow: "0 12px 30px var(--shadow)",
        scale: 1.02,
        zIndex: 2,
      }}
    >
      <button
        aria-hidden="true"
        className={styles.dragHandle}
        onPointerDown={(event) => dragControls.start(event)}
        tabIndex={-1}
        type="button"
      >
        <DotsSixVerticalIcon size={18} weight="bold" />
      </button>
      <div className={styles.order}>{String(index + 1).padStart(2, "0")}</div>
      <div className={styles.exerciseConfig}>
        <header>
          <button
            aria-expanded={expanded}
            aria-controls={`exercise-config-${exercise.id}`}
            className={styles.configToggle}
            onClick={onToggle}
            type="button"
          >
            <span>
              <strong>{exercise.name}</strong>
              <small>{trackingLabel(exercise.trackingType)}</small>
            </span>
            <MotionCaretDown
              animate={{ rotate: expanded ? 180 : 0 }}
              aria-hidden="true"
              initial={false}
              size={20}
              transition={{ type: "spring", duration: 0.3, bounce: 0 }}
              weight="bold"
            />
          </button>
          <div className={styles.orderButtons}>
            <button
              onClick={onRemove}
              type="button"
              aria-label={`Remove ${exercise.name}`}
            >
              <XIcon aria-hidden="true" size={16} weight="bold" />
            </button>
          </div>
        </header>
        <Collapsible
          className={styles.configGrid}
          id={`exercise-config-${exercise.id}`}
          open={expanded}
        >
          <NumberField
            label="Sets"
            max={20}
            min={1}
            value={exercise.targetSets}
            onChange={(value) => onUpdate("targetSets", value)}
          />
          <NumberField
            label="Min reps"
            max={100}
            min={1}
            value={exercise.targetRepMin}
            onChange={(value) => onUpdate("targetRepMin", value)}
          />
          <NumberField
            label="Max reps"
            max={100}
            min={exercise.targetRepMin}
            value={exercise.targetRepMax}
            onChange={(value) => onUpdate("targetRepMax", value)}
          />
          <NumberField
            label="Rest (sec)"
            max={3600}
            min={0}
            step={15}
            value={exercise.defaultRestSeconds}
            onChange={(value) => onUpdate("defaultRestSeconds", value)}
          />
          <div className={styles.moveButtons}>
            <button disabled={isFirst} onClick={() => onMove(-1)} type="button">
              <ArrowUpIcon aria-hidden="true" size={16} weight="bold" />
              Move earlier
            </button>
            <button disabled={isLast} onClick={() => onMove(1)} type="button">
              <ArrowDownIcon aria-hidden="true" size={16} weight="bold" />
              Move later
            </button>
          </div>
        </Collapsible>
      </div>
    </Reorder.Item>
  );
}

export function CreateWorkoutBuilder({
  catalog,
  initialGuidance,
  workout,
}: {
  catalog: ExerciseCatalogItem[];
  initialGuidance: GuidanceState;
  workout?: WorkoutTemplateDraft;
}) {
  const saveWorkout = workout
    ? updateWorkout.bind(null, workout.id)
    : createWorkout;
  const [workoutState, workoutAction, workoutPending] = useActionState(
    saveWorkout,
    initialWorkoutState,
  );
  const [exerciseState, exerciseAction, exercisePending] = useActionState(
    createCustomExercise,
    initialExerciseState,
  );
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<WorkoutExerciseDraft[]>(
    workout?.exercises ?? [],
  );
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(
    null,
  );
  const [guidance, setGuidance] = useState(initialGuidance);
  const [, startGuidanceTransition] = useTransition();

  const available = useMemo(() => {
    const created = exerciseState.exercise ? [exerciseState.exercise] : [];
    const combined = [...created, ...catalog].filter(
      (exercise, index, rows) =>
        rows.findIndex((candidate) => candidate.id === exercise.id) === index,
    );
    const query = search.trim().toLowerCase();

    return combined
      .filter((exercise) => !selected.some((item) => item.id === exercise.id))
      .filter(
        (exercise) => !query || exercise.name.toLowerCase().includes(query),
      );
  }, [catalog, exerciseState.exercise, search, selected]);
  const availableGroups = useMemo(() => groupExercises(available), [available]);

  const markGuidance = (key: GuidanceKey, outcome: GuidanceOutcome) => {
    setGuidance((current) => ({
      completed:
        outcome === "completed"
          ? [...new Set([...current.completed, key])]
          : current.completed.filter((item) => item !== key),
      dismissed:
        outcome === "dismissed"
          ? [...new Set([...current.dismissed, key])]
          : current.dismissed.filter((item) => item !== key),
    }));
    startGuidanceTransition(() => {
      void recordGuidance(key, outcome);
    });
  };

  const addExercise = (exercise: ExerciseCatalogItem) => {
    setSelected((current) => [
      ...current,
      {
        ...exercise,
        defaultRestSeconds: 120,
        targetRepMax: 12,
        targetRepMin: 8,
        targetSets: 3,
      },
    ]);
    setExpandedExerciseId(exercise.id);
    markGuidance("workout-builder.add-exercise.v1", "completed");
  };

  const updateExercise = (
    index: number,
    field:
      "defaultRestSeconds" | "targetRepMax" | "targetRepMin" | "targetSets",
    value: number,
  ) => {
    setSelected((current) =>
      current.map((exercise, exerciseIndex) =>
        exerciseIndex === index ? { ...exercise, [field]: value } : exercise,
      ),
    );
    if (!hasSeenGuidance(guidance, "workout-builder.configure-exercise.v1")) {
      markGuidance("workout-builder.configure-exercise.v1", "completed");
    }
  };

  const moveExercise = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= selected.length) return;

    setSelected((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const showAddGuide =
    selected.length === 0 &&
    !hasSeenGuidance(guidance, "workout-builder.add-exercise.v1");
  const showConfigureGuide =
    selected.length > 0 &&
    !hasSeenGuidance(guidance, "workout-builder.configure-exercise.v1");
  const showSaveGuide =
    selected.length > 0 &&
    hasSeenGuidance(guidance, "workout-builder.configure-exercise.v1") &&
    !hasSeenGuidance(guidance, "workout-builder.save-workout.v1");

  return (
    <main className={styles.page}>
      <form action={workoutAction} className={styles.builder}>
        <header className={styles.topbar}>
          <Link
            href="/workouts"
            transitionTypes={navBack}
            aria-label={
              workout ? "Cancel workout editing" : "Cancel workout creation"
            }
          >
            <ArrowLeftIcon aria-hidden="true" size={20} weight="bold" />
          </Link>
          <strong>{workout ? "Edit workout" : "New workout"}</strong>
          <button
            disabled={workoutPending || selected.length === 0}
            type="submit"
          >
            {workoutPending ? "Saving…" : "Save"}
          </button>
        </header>

        <section className={styles.identity}>
          <p>Workout details</p>
          <label>
            <span>Name your workout</span>
            <input
              aria-describedby={
                workoutState.fieldErrors?.name
                  ? "workout-name-error"
                  : undefined
              }
              aria-invalid={Boolean(workoutState.fieldErrors?.name)}
              autoFocus
              defaultValue={workout?.name}
              name="name"
              placeholder="e.g. Full Body A"
              required
            />
          </label>
          {workoutState.fieldErrors?.name && (
            <small id="workout-name-error">
              {workoutState.fieldErrors.name}
            </small>
          )}
        </section>

        <input
          name="exercises"
          type="hidden"
          value={JSON.stringify(selected)}
        />

        <section className={styles.ledger}>
          <header>
            <div>
              <span>Exercise order</span>
              <strong>
                {selected.length
                  ? `${selected.length} ${selected.length === 1 ? "exercise" : "exercises"}`
                  : "No exercises yet"}
              </strong>
            </div>
            <small>In your training order</small>
          </header>

          {showConfigureGuide && (
            <Coachmark
              body="Choose the sets, rep range, and rest for each exercise. They’re used every time you start this workout."
              dismiss={() =>
                markGuidance(
                  "workout-builder.configure-exercise.v1",
                  "dismissed",
                )
              }
              label="Set up each exercise"
            />
          )}

          {selected.length === 0 ? (
            <div className={styles.ledgerEmpty}>
              <span>01</span>
              <p>
                Add exercises below. They will appear here in training order.
              </p>
            </div>
          ) : (
            <Reorder.Group
              as="ol"
              axis="y"
              className={styles.selectedList}
              onReorder={setSelected}
              values={selected}
            >
              {selected.map((exercise, index) => (
                <SelectedExerciseRow
                  exercise={exercise}
                  expanded={expandedExerciseId === exercise.id}
                  index={index}
                  isFirst={index === 0}
                  isLast={index === selected.length - 1}
                  key={exercise.id}
                  onMove={(direction) => moveExercise(index, direction)}
                  onRemove={() => {
                    setSelected((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    );
                    setExpandedExerciseId((current) =>
                      current === exercise.id ? null : current,
                    );
                  }}
                  onToggle={() =>
                    setExpandedExerciseId((current) =>
                      current === exercise.id ? null : exercise.id,
                    )
                  }
                  onUpdate={(field, value) =>
                    updateExercise(index, field, value)
                  }
                />
              ))}
            </Reorder.Group>
          )}

          {workoutState.fieldErrors?.exercises && (
            <p className={styles.formError}>
              {workoutState.fieldErrors.exercises}
            </p>
          )}
        </section>

        <Disclosure
          className={styles.catalogDisclosure}
          contentClassName={styles.catalog}
          defaultOpen={selected.length === 0}
          label="Add exercises"
        >
          <header>
            <div>
              <span>Exercise library</span>
              <strong>Add to this workout</strong>
            </div>
            <small>{catalog.length} available</small>
          </header>

          {showAddGuide && (
            <Coachmark
              body="Search the library and add exercises in the order you’ll do them."
              dismiss={() =>
                markGuidance("workout-builder.add-exercise.v1", "dismissed")
              }
              label="Add your first exercise"
            />
          )}

          <label className={styles.search}>
            <span aria-hidden="true">
              <MagnifyingGlassIcon size={18} weight="bold" />
            </span>
            <input
              aria-label="Search exercises"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search bench, squat, row…"
              value={search}
            />
          </label>

          <div className={styles.catalogGroups}>
            {availableGroups.map((group, index) => (
              <CatalogGroup
                addExercise={addExercise}
                defaultOpen={index === 0}
                forceOpen={Boolean(search.trim())}
                group={group}
                key={group.key}
              />
            ))}
            {available.length === 0 && (
              <p>No matching exercises. Create a custom one below.</p>
            )}
          </div>
        </Disclosure>

        <Disclosure
          className={styles.customExercise}
          contentClassName={styles.customExerciseContent}
          label="Create a custom exercise"
        >
          <label>
            <span>Exercise name</span>
            <input
              name="customExerciseName"
              placeholder="e.g. Cable Y-raise"
              form="custom-exercise-form"
            />
          </label>
          <div className={styles.fieldGroup}>
            <span>Track with</span>
            <SelectField
              ariaLabel="Track with"
              defaultValue="weight_reps"
              form="custom-exercise-form"
              name="trackingType"
              options={trackingOptions}
            />
          </div>
          <button
            disabled={exercisePending}
            form="custom-exercise-form"
            type="submit"
          >
            {exercisePending ? "Creating…" : "Create exercise"}
          </button>
          {exerciseState.message && (
            <p className={styles.formError}>{exerciseState.message}</p>
          )}
          {exerciseState.exercise && (
            <p className={styles.createdMessage}>
              {exerciseState.exercise.name} is ready in the library above.
            </p>
          )}
        </Disclosure>

        {!workout && showSaveGuide && (
          <div className={styles.saveGuide}>
            <Coachmark
              body="Save it and it’ll be waiting under Workouts the next time you train."
              dismiss={() =>
                markGuidance("workout-builder.save-workout.v1", "dismissed")
              }
              label="Ready to save"
            />
          </div>
        )}

        {workoutState.message && (
          <p className={styles.submitError} role="alert">
            {workoutState.message}
          </p>
        )}
        <button
          className={styles.saveButton}
          disabled={workoutPending || selected.length === 0}
          type="submit"
        >
          <span>
            {workoutPending
              ? "Saving workout…"
              : workout
                ? "Save changes"
                : "Save workout"}
          </span>
          <ArrowRightIcon aria-hidden="true" size={18} weight="bold" />
        </button>
      </form>

      {workout && (
        <form
          action={archiveWorkout.bind(null, workout.id)}
          className={styles.archiveForm}
          onSubmit={(event) => {
            if (
              !window.confirm(
                `Archive ${workout.name}? Your completed workouts will stay in your history.`,
              )
            )
              event.preventDefault();
          }}
        >
          <button type="submit">Archive workout</button>
          <p>Your past workouts and progress won’t be removed.</p>
        </form>
      )}

      <form action={exerciseAction} id="custom-exercise-form" />
    </main>
  );
}

function CatalogGroup({
  addExercise,
  defaultOpen,
  forceOpen,
  group,
}: {
  addExercise: (exercise: ExerciseCatalogItem) => void;
  defaultOpen: boolean;
  forceOpen: boolean;
  group: ExerciseGroup;
}) {
  const [userOpen, setUserOpen] = useState(defaultOpen);
  const open = forceOpen || userOpen;

  const panelId = `workout-catalog-${group.key}`;
  return (
    <section className={styles.catalogGroup}>
      <button
        aria-controls={panelId}
        aria-expanded={open}
        className={styles.catalogGroupHeader}
        onClick={() => setUserOpen((current) => !current)}
        type="button"
      >
        <span>
          <strong>{group.label}</strong>
          <small>{group.exercises.length} available</small>
        </span>
        <MotionCaretDown
          animate={{ rotate: open ? 180 : 0 }}
          aria-hidden="true"
          initial={false}
          size={19}
          transition={{ type: "spring", duration: 0.3, bounce: 0 }}
          weight="bold"
        />
      </button>
      <Collapsible className={styles.catalogList} id={panelId} open={open}>
        {group.exercises.map((exercise) => (
          <button
            key={exercise.id}
            onClick={() => addExercise(exercise)}
            type="button"
          >
            <div>
              <strong>{exercise.name}</strong>
              <small>
                {exercise.isCustom
                  ? "Custom exercise"
                  : trackingLabel(exercise.trackingType)}
              </small>
            </div>
            <span>Add</span>
          </button>
        ))}
      </Collapsible>
    </section>
  );
}

function Coachmark({
  body,
  dismiss,
  label,
}: {
  body: string;
  dismiss: () => void;
  label: string;
}) {
  return (
    <aside className={styles.coachmark} aria-label="Contextual guidance">
      <div>
        <span>{label}</span>
        <p>{body}</p>
      </div>
      <button onClick={dismiss} type="button" aria-label="Dismiss tip">
        <XIcon aria-hidden="true" size={18} weight="bold" />
      </button>
    </aside>
  );
}

function NumberField({
  label,
  max,
  min,
  onChange,
  step = 1,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step?: number;
  value: number;
}) {
  return (
    <label>
      <span>{label}</span>
      <input
        inputMode="numeric"
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        type="number"
        value={value}
      />
    </label>
  );
}
