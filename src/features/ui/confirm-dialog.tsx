"use client";

import { useEffect, useRef, type RefObject } from "react";
import { createPortal } from "react-dom";
import { ArchiveIcon, WarningIcon } from "@phosphor-icons/react";

import styles from "./confirm-dialog.module.css";

type ConfirmDialogProps = {
  action: (formData: FormData) => void;
  cancelLabel?: string;
  confirmLabel: string;
  description: string;
  error?: string;
  intent?: "archive" | "danger";
  onClose: () => void;
  open: boolean;
  pending: boolean;
  pendingLabel?: string;
  title: string;
  triggerRef: RefObject<HTMLButtonElement | null>;
};

export function ConfirmDialog({
  action,
  cancelLabel = "Cancel",
  confirmLabel,
  description,
  error,
  intent = "danger",
  onClose,
  open,
  pending,
  pendingLabel = "Working…",
  title,
  triggerRef,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const pendingRef = useRef(pending);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pendingRef.current) {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      trigger?.focus();
    };
  }, [onClose, open, triggerRef]);

  if (!open) return null;

  return createPortal(
    <div className={styles.layer}>
      <div
        aria-hidden="true"
        className={styles.backdrop}
        onClick={() => {
          if (!pending) onClose();
        }}
      />
      <section
        aria-describedby="confirm-dialog-description"
        aria-labelledby="confirm-dialog-title"
        aria-modal="true"
        className={styles.dialog}
        ref={dialogRef}
        role="alertdialog"
      >
        <div className={`${styles.icon} ${styles[intent]}`} aria-hidden="true">
          {intent === "archive" ? (
            <ArchiveIcon size={22} weight="regular" />
          ) : (
            <WarningIcon size={22} weight="regular" />
          )}
        </div>
        <div className={styles.copy}>
          <h2 id="confirm-dialog-title">{title}</h2>
          <p id="confirm-dialog-description">{description}</p>
        </div>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <form action={action} className={styles.actions}>
          <button
            className={styles.cancel}
            disabled={pending}
            onClick={onClose}
            ref={cancelRef}
            type="button"
          >
            {cancelLabel}
          </button>
          <button className={`${styles.confirm} ${styles[intent]}`} disabled={pending} type="submit">
            {pending ? pendingLabel : confirmLabel}
          </button>
        </form>
      </section>
    </div>,
    document.body,
  );
}
