"use client";

import { useActionState, useCallback, useRef, useState } from "react";

import { ConfirmDialog } from "@/features/ui/confirm-dialog";

import { discardSession, type DiscardSessionState } from "./actions";

const initialState: DiscardSessionState = {};

export function DiscardWorkoutButton({
  className,
  completedSets,
  disabled = false,
  sessionId,
}: {
  className: string;
  completedSets: number;
  disabled?: boolean;
  sessionId: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [state, formAction, pending] = useActionState(
    discardSession.bind(null, sessionId),
    initialState,
  );
  const close = useCallback(() => setOpen(false), []);

  const description =
    completedSets === 0
      ? "Nothing has been logged yet, so the workout will be removed."
      : `The ${completedSets} ${completedSets === 1 ? "set" : "sets"} you logged won’t count toward your history or progress.`;

  return (
    <>
      <button
        className={className}
        disabled={disabled || pending}
        onClick={() => setOpen(true)}
        ref={triggerRef}
        type="button"
      >
        Discard workout
      </button>
      <ConfirmDialog
        action={formAction}
        cancelLabel="Keep workout"
        confirmLabel="Discard"
        description={description}
        error={state.message}
        onClose={close}
        open={open}
        pending={pending}
        pendingLabel="Discarding…"
        title="Discard this workout?"
        triggerRef={triggerRef}
      />
    </>
  );
}
