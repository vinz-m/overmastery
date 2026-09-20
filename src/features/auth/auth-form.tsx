"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useRef } from "react";
import { ArrowRightIcon } from "@phosphor-icons/react";

import {
  signIn,
  signUp,
  type AuthActionState,
} from "./actions";
import styles from "./auth.module.css";

const initialState: AuthActionState = {};

export function AuthForm({
  mode,
  notice,
}: {
  mode: "login" | "signup";
  notice?: string;
}) {
  const action = mode === "login" ? signIn : signUp;
  const [state, formAction, pending] = useActionState(action, initialState);
  const isLogin = mode === "login";
  const formRef = useRef<HTMLFormElement>(null);
  const actionError = state.success ? undefined : state.message;
  const successMessage = state.success ? state.message : undefined;

  useEffect(() => {
    const firstInvalidField = ["displayName", "email", "password"].find(
      (fieldName) => state.fieldErrors?.[fieldName as keyof NonNullable<AuthActionState["fieldErrors"]>],
    );

    if (!firstInvalidField) return;
    formRef.current
      ?.querySelector<HTMLInputElement>(`[name="${firstInvalidField}"]`)
      ?.focus();
  }, [state.fieldErrors]);

  return (
    <form
      action={formAction}
      aria-busy={pending}
      className={styles.form}
      noValidate
      ref={formRef}
    >
      {notice && (
        <p className={styles.error} role="alert">
          {notice}
        </p>
      )}
      {!isLogin && (
        <Field
          autoComplete="name"
          error={state.fieldErrors?.displayName}
          label="Name"
          maxLength={80}
          minLength={2}
          name="displayName"
          placeholder="What should we call you?"
          required
          type="text"
        />
      )}

      <Field
        autoComplete="email"
        error={state.fieldErrors?.email}
        label="Email"
        maxLength={254}
        name="email"
        placeholder="you@example.com"
        required
        type="email"
      />

      <Field
        autoComplete={isLogin ? "current-password" : "new-password"}
        error={state.fieldErrors?.password}
        hint={isLogin ? undefined : "8 characters minimum"}
        label="Password"
        minLength={8}
        name="password"
        placeholder="••••••••"
        required
        type="password"
      />

      <p
        aria-atomic="true"
        className={actionError ? styles.error : styles.liveRegion}
        role="alert"
      >
        {actionError ?? ""}
      </p>
      <p
        aria-atomic="true"
        className={successMessage ? styles.success : styles.liveRegion}
        role="status"
      >
        {successMessage ?? ""}
      </p>

      <button className={styles.submit} disabled={pending} type="submit">
        <span>
          {pending
            ? isLogin
              ? "Signing in…"
              : "Creating account…"
            : isLogin
              ? "Sign in"
              : "Create account"}
        </span>
        <ArrowRightIcon aria-hidden="true" size={18} weight="bold" />
      </button>

      <p className={styles.switchMode}>
        {isLogin ? "New to Overmastery?" : "Already have an account?"}{" "}
        <Link href={isLogin ? "/signup" : "/login"}>
          {isLogin ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </form>
  );
}

type FieldProps = {
  autoComplete: string;
  error?: string;
  hint?: string;
  label: string;
  maxLength?: number;
  minLength?: number;
  name: string;
  placeholder: string;
  required?: boolean;
  type: "email" | "password" | "text";
};

function Field({
  autoComplete,
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
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy = [hint ? hintId : undefined, error ? errorId : undefined]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className={styles.field}>
      <div className={styles.fieldLabel}>
        <label htmlFor={inputId}>{label}</label>
        {hint && <small id={hintId}>{hint}</small>}
      </div>
      <input
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        autoComplete={autoComplete}
        autoCapitalize={type === "text" ? "words" : "none"}
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
      {error && (
        <span className={styles.fieldError} id={errorId}>
          {error}
        </span>
      )}
    </div>
  );
}
