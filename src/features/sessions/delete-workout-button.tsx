"use client";

import { useActionState, useCallback, useRef, useState } from "react";

import { ConfirmDialog } from "@/features/ui/confirm-dialog";

import { deleteSession, type DeleteSessionState } from "./actions";

const initialState: DeleteSessionState = {};

export function DeleteWorkoutButton({
  className,
  sessionId,
}: {
  className: string;
  sessionId: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [state, formAction, pending] = useActionState(
    deleteSession.bind(null, sessionId),
    initialState,
  );
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        className={className}
        disabled={pending}
        onClick={() => setOpen(true)}
        ref={triggerRef}
        type="button"
      >
        Delete workout
      </button>
      <ConfirmDialog
        action={formAction}
        cancelLabel="Keep workout"
        confirmLabel="Delete"
        description="It will be removed from your history, and progress will compare against your other workouts instead. This can’t be undone."
        error={state.message}
        onClose={close}
        open={open}
        pending={pending}
        pendingLabel="Deleting…"
        title="Delete this workout?"
        triggerRef={triggerRef}
      />
    </>
  );
}
