"use client";

import { useId, useState, type ReactNode } from "react";
import { ArrowRightIcon, EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";

import styles from "./auth.module.css";

type FieldProps = {
  autoComplete: string;
  /** Refills the field after a failed submit (React resets forms on submit). */
  defaultValue?: string;
  error?: string;
  hint?: ReactNode;
  label: string;
  maxLength?: number;
  minLength?: number;
  name: string;
  placeholder: string;
  required?: boolean;
  type: "email" | "text";
};

export function Field({
  autoComplete,
  defaultValue,
  error,
  hint,
  label,
  maxLength,
  minLength,
  name,
  placeholder,
  required,
  type,
}: FieldProps) {
  const inputId = useId();
  return (
    <FieldFrame error={error} hint={hint} inputId={inputId} label={label}>
      {(describedBy) => (
        <input
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          autoCapitalize={type === "text" ? "words" : "none"}
          autoComplete={autoComplete}
          defaultValue={defaultValue}
          id={inputId}
          inputMode={type === "email" ? "email" : undefined}
          maxLength={maxLength}
          minLength={minLength}
          name={name}
          placeholder={placeholder}
          required={required}
          spellCheck={type === "text"}
          type={type}
        />
      )}
    </FieldFrame>
  );
}

/** Password input with a show/hide toggle so people can check what they typed. */
export function PasswordField({
  autoComplete,
  error,
  hint,
  label,
}: {
  autoComplete: "current-password" | "new-password";
  error?: string;
  hint?: ReactNode;
  label: string;
}) {
  const inputId = useId();
  const [visible, setVisible] = useState(false);
  return (
    <FieldFrame error={error} hint={hint} inputId={inputId} label={label}>
      {(describedBy) => (
        <div className={styles.passwordControl}>
          <input
            aria-describedby={describedBy}
            aria-invalid={Boolean(error)}
            autoCapitalize="none"
            autoComplete={autoComplete}
            id={inputId}
            minLength={8}
            name="password"
            placeholder="••••••••"
            required
            spellCheck={false}
            type={visible ? "text" : "password"}
          />
          <button
            aria-controls={inputId}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            className={styles.revealToggle}
            onClick={() => setVisible((current) => !current)}
            type="button"
          >
            {visible ? (
              <EyeSlashIcon aria-hidden="true" size={20} />
            ) : (
              <EyeIcon aria-hidden="true" size={20} />
            )}
          </button>
        </div>
      )}
    </FieldFrame>
  );
}

function FieldFrame({
  children,
  error,
  hint,
  inputId,
  label,
}: {
  children: (describedBy: string | undefined) => ReactNode;
  error?: string;
  hint?: ReactNode;
  inputId: string;
  label: string;
}) {
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  // A hint that is a link (e.g. "Forgot password?") isn't a description.
  const hintDescribes = typeof hint === "string";
  const describedBy =
    [hintDescribes ? hintId : undefined, error ? errorId : undefined]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <div className={styles.field}>
      <div className={styles.fieldLabel}>
        <label htmlFor={inputId}>{label}</label>
        {hint && (hintDescribes ? <small id={hintId}>{hint}</small> : hint)}
      </div>
      {children(describedBy)}
      {error && (
        <span className={styles.fieldError} id={errorId}>
          {error}
        </span>
      )}
    </div>
  );
}

/** Error and success messages, announced to screen readers when they change. */
export function FormStatus({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  return (
    <>
      <p
        aria-atomic="true"
        className={error ? styles.error : styles.liveRegion}
        role="alert"
      >
        {error ?? ""}
      </p>
      <p
        aria-atomic="true"
        className={success ? styles.success : styles.liveRegion}
        role="status"
      >
        {success ?? ""}
      </p>
    </>
  );
}

export function SubmitButton({
  children,
  pending,
  pendingLabel,
}: {
  children: string;
  pending: boolean;
  pendingLabel: string;
}) {
  return (
    <button className={styles.submit} disabled={pending} type="submit">
      <span>{pending ? pendingLabel : children}</span>
      <ArrowRightIcon aria-hidden="true" size={18} weight="bold" />
    </button>
  );
}
