"use client";

import { useActionState, useId } from "react";
import { CaretRightIcon } from "@phosphor-icons/react";

import {
  startWorkout,
  type StartWorkoutState,
} from "@/features/sessions/actions";

import styles from "./start-workout-form.module.css";

const initialState: StartWorkoutState = {};

export function StartWorkoutForm({
  disabled = false,
  label,
  showArrow = false,
  workoutId,
}: {
  disabled?: boolean;
  label: string;
  showArrow?: boolean;
  workoutId: string;
}) {
  const errorId = useId();
  const action = startWorkout.bind(null, workoutId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} aria-busy={pending} className={styles.form}>
      <button
        aria-describedby={state.message ? errorId : undefined}
        disabled={disabled || pending}
        type="submit"
      >
        <span>{pending ? "Starting…" : label}</span>
        {showArrow && <CaretRightIcon aria-hidden="true" size={18} weight="bold" />}
      </button>
      <span aria-live="polite" className={styles.status}>
        {pending ? "Starting workout…" : ""}
      </span>
      {state.message && (
        <div className={styles.error} id={errorId} role="alert">
          {state.message}
        </div>
      )}
    </form>
  );
}
