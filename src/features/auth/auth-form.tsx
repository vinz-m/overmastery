"use client";

import Link from "next/link";
import { useActionState } from "react";

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

  return (
    <form className={styles.form} action={formAction} noValidate>
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
          name="displayName"
          placeholder="What should we call you?"
          type="text"
        />
      )}

      <Field
        autoComplete="email"
        error={state.fieldErrors?.email}
        label="Email"
        name="email"
        placeholder="you@example.com"
        type="email"
      />

      <Field
        autoComplete={isLogin ? "current-password" : "new-password"}
        error={state.fieldErrors?.password}
        hint={isLogin ? undefined : "8 characters minimum"}
        label="Password"
        name="password"
        placeholder="••••••••"
        type="password"
      />

      {state.message && (
        <p
          className={state.success ? styles.success : styles.error}
          role={state.success ? "status" : "alert"}
        >
          {state.message}
        </p>
      )}

      <button className={styles.submit} disabled={pending} type="submit">
        <span>{pending ? "Working…" : isLogin ? "Sign in" : "Create account"}</span>
        <span aria-hidden="true">→</span>
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
  name: string;
  placeholder: string;
  type: "email" | "password" | "text";
};

function Field({
  autoComplete,
  error,
  hint,
  label,
  name,
  placeholder,
  type,
}: FieldProps) {
  const errorId = `${name}-error`;

  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </span>
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        autoComplete={autoComplete}
        name={name}
        placeholder={placeholder}
        type={type}
      />
      {error && (
        <span className={styles.fieldError} id={errorId}>
          {error}
        </span>
      )}
    </label>
  );
}
