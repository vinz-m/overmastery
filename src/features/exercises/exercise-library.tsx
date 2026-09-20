"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useActionState, useCallback, useMemo, useRef, useState } from "react";
import { CaretDownIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";

import { ConfirmDialog } from "@/features/ui/confirm-dialog";
import { Collapsible, Disclosure } from "@/features/ui/disclosure";
import { SelectField } from "@/features/ui/select-field";
import {
  archiveCustomExercise,
  createCustomExercise,
  restoreCustomExercise,
  type CreateExerciseState,
  type CustomExerciseState,
  updateCustomExercise,
} from "@/features/workouts/actions";
import type { ExerciseCatalogItem } from "@/features/workouts/types";

import {
  filterExercises,
  groupExercises,
  type ExerciseGroup,
  type ExerciseSourceFilter,
} from "./exercise-filter";
import styles from "./exercise-library.module.css";

const MotionCaretDown = motion.create(CaretDownIcon);

const initialExerciseState: CreateExerciseState = {};
const initialCustomExerciseState: CustomExerciseState = {};
const trackingOptions = [
  { label: "Weight + reps", value: "weight_reps" },
  { label: "Bodyweight + reps", value: "bodyweight_reps" },
  { label: "Added weight + reps", value: "added_weight_reps" },
  { label: "Assistance + reps", value: "assistance_reps" },
];
const sourceFilters: { label: string; value: ExerciseSourceFilter }[] = [
  { label: "All", value: "all" },
  { label: "Library", value: "library" },
  { label: "Custom", value: "custom" },
  { label: "Archived", value: "archived" },
];

export function ExerciseLibrary({
  archivedCatalog,
  catalog,
}: {
  archivedCatalog: ExerciseCatalogItem[];
  catalog: ExerciseCatalogItem[];
}) {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] =
    useState<ExerciseSourceFilter>("all");
  const [exerciseOverrides, setExerciseOverrides] = useState<
    Record<string, ExerciseCatalogItem | null>
  >({});
  const reduceMotion = useReducedMotion();
  const [exerciseState, exerciseAction, exercisePending] = useActionState(
    createCustomExercise,
    initialExerciseState,
  );
  const exercises = useMemo(() => {
    const created = exerciseState.exercise ? [exerciseState.exercise] : [];
    const combined = [...created, ...catalog, ...archivedCatalog]
      .filter(
        (exercise, index, rows) =>
          rows.findIndex((candidate) => candidate.id === exercise.id) === index,
      )
      .flatMap((exercise) => {
        const override = exerciseOverrides[exercise.id];
        if (override === null) return [];
        return [override ?? exercise];
      });
    return filterExercises(combined, search, sourceFilter);
  }, [archivedCatalog, catalog, exerciseOverrides, exerciseState.exercise, search, sourceFilter]);
  const groups = useMemo(() => groupExercises(exercises), [exercises]);

  return (
    <>
        <section className={styles.lead}>
          <p>Exercises</p>
          <h1>Exercises</h1>
          <span>Browse the movements available when building a workout.</span>
        </section>

        <section className={styles.controls}>
          <label className={styles.search}>
            <span aria-hidden="true"><MagnifyingGlassIcon size={19} weight="bold" /></span>
            <input
              aria-label="Search exercises"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search bench, squat, row…"
              value={search}
            />
          </label>

          <div className={styles.sourceFilters} aria-label="Filter exercises by source">
            {sourceFilters.map((filter) => (
              <button
                aria-pressed={sourceFilter === filter.value}
                key={filter.value}
                onClick={() => setSourceFilter(filter.value)}
                type="button"
              >
                {sourceFilter === filter.value && (
                  <motion.span
                    className={styles.sourceFilterIndicator}
                    layoutId="exercise-source-filter-indicator"
                    transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
                  />
                )}
                <span className={styles.sourceFilterLabel}>{filter.label}</span>
              </button>
            ))}
          </div>

          <Disclosure
            className={styles.createExercise}
            contentClassName={styles.createExerciseContent}
            label="Create a custom exercise"
          >
            <form action={exerciseAction}>
              <label>
                <span>Exercise name</span>
                <input
                  name="customExerciseName"
                  placeholder="e.g. Cable Y-raise"
                  required
                />
              </label>
              <div className={styles.fieldGroup}>
                <span>Track with</span>
                <SelectField
                  ariaLabel="Track with"
                  defaultValue="weight_reps"
                  name="trackingType"
                  options={trackingOptions}
                />
              </div>
              <button disabled={exercisePending} type="submit">
                {exercisePending ? "Creating…" : "Create exercise"}
              </button>
              {exerciseState.message && (
                <p role="alert">{exerciseState.message}</p>
              )}
              {exerciseState.exercise && (
                <p>{exerciseState.exercise.name} is now in your library.</p>
              )}
            </form>
          </Disclosure>
        </section>

        <section className={styles.catalog}>
          <header>
            <div>
              <span>{sourceFilter === "archived" ? "Archived exercises" : "Available exercises"}</span>
              <h2 aria-live="polite" aria-atomic="true">
                {exercises.length} {exercises.length === 1 ? "match" : "matches"}
              </h2>
            </div>
            <small>Choose these while creating a workout</small>
          </header>

          <div className={styles.exerciseList}>
            <AnimatePresence initial={false} mode="popLayout">
              {groups.map((group, index) => (
                <ExerciseGroupSection
                  defaultOpen={index === 0}
                  forceOpen={Boolean(search.trim())}
                  group={group}
                  key={group.key}
                  onArchive={(exercise) => setExerciseOverrides((current) => ({ ...current, [exercise.id]: { ...exercise, isArchived: true } }))}
                  onRestore={(exercise) => setExerciseOverrides((current) => ({ ...current, [exercise.id]: exercise }))}
                  onUpdate={(exercise) => setExerciseOverrides((current) => ({ ...current, [exercise.id]: exercise }))}
                  reduceMotion={Boolean(reduceMotion)}
                />
              ))}
            {exercises.length === 0 && (
              <motion.div
                animate={{ opacity: 1 }}
                className={styles.noResults}
                initial={reduceMotion ? false : { opacity: 0 }}
                key={`empty-${sourceFilter}-${search}`}
              >
                {emptyMessage(search, sourceFilter)}
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        </section>
    </>
  );
}

function ExerciseGroupSection({
  defaultOpen,
  forceOpen,
  group,
  onArchive,
  onRestore,
  onUpdate,
  reduceMotion,
}: {
  defaultOpen: boolean;
  forceOpen: boolean;
  group: ExerciseGroup;
  onArchive: (exercise: ExerciseCatalogItem) => void;
  onRestore: (exercise: ExerciseCatalogItem) => void;
  onUpdate: (exercise: ExerciseCatalogItem) => void;
  reduceMotion: boolean;
}) {
  const [userOpen, setUserOpen] = useState(defaultOpen);
  const open = forceOpen || userOpen;

  const panelId = `exercise-group-${group.key}`;
  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className={styles.exerciseGroup}
      exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
      initial={reduceMotion ? false : { opacity: 0, y: 4 }}
      layout={!reduceMotion}
      transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <button
        aria-controls={panelId}
        aria-expanded={open}
        className={styles.exerciseGroupHeader}
        onClick={() => setUserOpen((current) => !current)}
        type="button"
      >
        <span><strong>{group.label}</strong><small>{group.exercises.length} {group.exercises.length === 1 ? "exercise" : "exercises"}</small></span>
        <MotionCaretDown
          animate={{ rotate: open ? 180 : 0 }}
          aria-hidden="true"
          initial={false}
          size={20}
          transition={{ type: "spring", duration: 0.3, bounce: 0 }}
          weight="bold"
        />
      </button>
      <Collapsible className={styles.groupItems} id={panelId} open={open}>
        {group.exercises.map((exercise) => exercise.isArchived ? (
          <ArchivedExerciseItem
            exercise={exercise}
            key={exercise.id}
            onRestore={onRestore}
          />
        ) : exercise.isCustom ? (
          <CustomExerciseItem
            exercise={exercise}
            key={exercise.id}
            onArchive={onArchive}
            onUpdate={onUpdate}
          />
        ) : (
          <article key={exercise.id}>
            <div>
              <strong>{exercise.name}</strong>
              <small>{trackingLabel(exercise.trackingType)}</small>
            </div>
            <b className={styles.libraryTag}>Library</b>
          </article>
        ))}
      </Collapsible>
    </motion.section>
  );
}

function CustomExerciseItem({
  exercise,
  onArchive,
  onUpdate,
}: {
  exercise: ExerciseCatalogItem;
  onArchive: (exercise: ExerciseCatalogItem) => void;
  onUpdate: (exercise: ExerciseCatalogItem) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const archiveTriggerRef = useRef<HTMLButtonElement>(null);
  const [draftName, setDraftName] = useState(exercise.name);
  const [draftTrackingType, setDraftTrackingType] = useState(exercise.trackingType);
  const updateAction = async (
    previousState: CustomExerciseState,
    formData: FormData,
  ) => {
    const nextState = await updateCustomExercise(exercise.id, previousState, formData);
    if (nextState.exercise) {
      onUpdate(nextState.exercise);
      setDraftName(nextState.exercise.name);
      setDraftTrackingType(nextState.exercise.trackingType);
      setEditing(false);
    }
    return nextState;
  };
  const archiveAction = async (
    previousState: CustomExerciseState,
    formData: FormData,
  ) => {
    const nextState = await archiveCustomExercise(exercise.id, previousState, formData);
    if (nextState.archived) onArchive(exercise);
    return nextState;
  };
  const [updateState, submitUpdate, updatePending] = useActionState(
    updateAction,
    initialCustomExerciseState,
  );
  const [archiveState, submitArchive, archivePending] = useActionState(
    archiveAction,
    initialCustomExerciseState,
  );
  const panelId = `custom-exercise-editor-${exercise.id}`;
  const closeArchiveDialog = useCallback(() => setArchiveDialogOpen(false), []);

  return (
    <article className={styles.customCatalogItem}>
      <div className={styles.customSummary}>
        <div>
          <strong>{exercise.name}</strong>
          <small>{trackingLabel(exercise.trackingType)}</small>
        </div>
        <div className={styles.customSummaryActions}>
          <b className={styles.customTag}>Custom</b>
          <button
            aria-controls={panelId}
            aria-expanded={editing}
            onClick={() => {
              if (editing) {
                setDraftName(exercise.name);
                setDraftTrackingType(exercise.trackingType);
              }
              setEditing((current) => !current);
            }}
            type="button"
          >
            {editing ? "Close" : "Edit"}
          </button>
        </div>
      </div>

      <Collapsible className={styles.customEditor} id={panelId} open={editing}>
        <form action={submitUpdate}>
          <label>
            <span>Name</span>
            <input
              aria-describedby={updateState.fieldErrors?.name ? `${panelId}-name-error` : undefined}
              aria-invalid={Boolean(updateState.fieldErrors?.name)}
              maxLength={120}
              minLength={2}
              name="name"
              onChange={(event) => setDraftName(event.target.value)}
              required
              value={draftName}
            />
          </label>
          {updateState.fieldErrors?.name && <p id={`${panelId}-name-error`}>{updateState.fieldErrors.name}</p>}
          <div className={styles.fieldGroup}>
            <span>Track with</span>
            <SelectField
              ariaLabel={`Track ${exercise.name} with`}
              disabled={updatePending}
              name="trackingType"
              onValueChange={(value) => setDraftTrackingType(value as ExerciseCatalogItem["trackingType"])}
              options={trackingOptions}
              value={draftTrackingType}
            />
          </div>
          {updateState.fieldErrors?.trackingType && <p>{updateState.fieldErrors.trackingType}</p>}
          <button disabled={updatePending} type="submit">
            {updatePending ? "Saving…" : "Save changes"}
          </button>
          <p aria-live="polite" role={updateState.message ? "alert" : undefined}>{updateState.message}</p>
        </form>

        <div className={styles.archiveExercise}>
          <button
            disabled={archivePending}
            onClick={() => setArchiveDialogOpen(true)}
            ref={archiveTriggerRef}
            type="button"
          >
            Archive custom exercise
          </button>
          <small>Hide it from future workouts without losing its history.</small>
        </div>
      </Collapsible>

      <ConfirmDialog
        action={submitArchive}
        confirmLabel="Archive exercise"
        description="This hides it from workout building while keeping completed workout history. You can restore it later."
        error={archiveState.message}
        intent="archive"
        onClose={closeArchiveDialog}
        open={archiveDialogOpen}
        pending={archivePending}
        pendingLabel="Archiving…"
        title={`Archive ${exercise.name}?`}
        triggerRef={archiveTriggerRef}
      />
    </article>
  );
}

function ArchivedExerciseItem({
  exercise,
  onRestore,
}: {
  exercise: ExerciseCatalogItem;
  onRestore: (exercise: ExerciseCatalogItem) => void;
}) {
  const restoreAction = async (
    previousState: CustomExerciseState,
    formData: FormData,
  ) => {
    const nextState = await restoreCustomExercise(exercise.id, previousState, formData);
    if (nextState.exercise) onRestore(nextState.exercise);
    return nextState;
  };
  const [restoreState, submitRestore, restorePending] = useActionState(
    restoreAction,
    initialCustomExerciseState,
  );

  return (
    <article className={`${styles.customCatalogItem} ${styles.archivedCatalogItem}`}>
      <div className={styles.customSummary}>
        <div>
          <strong>{exercise.name}</strong>
          <small>{trackingLabel(exercise.trackingType)}</small>
        </div>
        <div className={styles.customSummaryActions}>
          <b className={styles.archivedTag}>Archived</b>
          <form action={submitRestore}>
            <button disabled={restorePending} type="submit">
              {restorePending ? "Restoring…" : "Restore"}
            </button>
          </form>
        </div>
      </div>
      {restoreState.message && (
        <p className={styles.restoreError} role="alert">{restoreState.message}</p>
      )}
    </article>
  );
}

function emptyMessage(search: string, source: ExerciseSourceFilter) {
  if (search.trim()) {
    const sourceLabel = source === "all" ? "" : `${source} `;
    return `No ${sourceLabel}exercises match “${search.trim()}”. Try another search.`;
  }

  if (source === "custom") {
    return "No custom exercises yet. Use Create a custom exercise to add one.";
  }
  if (source === "archived") {
    return "No archived exercises. Exercises you archive will appear here.";
  }
  if (source === "library") return "No library exercises are available.";
  return "No exercises are available yet.";
}

function trackingLabel(type: ExerciseCatalogItem["trackingType"]) {
  const labels: Record<ExerciseCatalogItem["trackingType"], string> = {
    added_weight_reps: "Added weight + reps",
    assistance_reps: "Assistance + reps",
    bodyweight_reps: "Bodyweight + reps",
    duration: "Duration",
    weight_distance: "Weight + distance",
    weight_duration: "Weight + duration",
    weight_reps: "Weight + reps",
  };
  return labels[type];
}
