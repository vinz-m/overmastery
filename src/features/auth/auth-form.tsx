"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";

import {
  requestPasswordReset,
  signIn,
  signUp,
  updatePassword,
  type AuthActionState,
} from "./actions";
import { Field, FormStatus, PasswordField, SubmitButton } from "./auth-fields";
import styles from "./auth.module.css";

const initialState: AuthActionState = {};

/** Moves focus to the first field the server rejected. */
function useFocusFirstError(state: AuthActionState) {
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const first = (["displayName", "email", "password"] as const).find(
      (name) => state.fieldErrors?.[name],
    );
    if (!first) return;
    formRef.current
      ?.querySelector<HTMLInputElement>(`[name="${first}"]`)
      ?.focus();
  }, [state.fieldErrors]);
  return formRef;
}

export function AuthForm({
  mode,
  notice,
}: {
  mode: "login" | "signup";
  notice?: string;
}) {
  const isLogin = mode === "login";
  const [state, formAction, pending] = useActionState(
    isLogin ? signIn : signUp,
    initialState,
  );
  const formRef = useFocusFirstError(state);

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
          defaultValue={state.fields?.displayName}
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
        defaultValue={state.fields?.email}
        error={state.fieldErrors?.email}
        label="Email"
        maxLength={254}
        name="email"
        placeholder="you@example.com"
        required
        type="email"
      />
      <PasswordField
        autoComplete={isLogin ? "current-password" : "new-password"}
        error={state.fieldErrors?.password}
        hint={
          isLogin ? (
            <Link className={styles.inlineLink} href="/forgot-password">
              Forgot password?
            </Link>
          ) : (
            "8 characters minimum"
          )
        }
        label="Password"
      />
      <FormStatus
        error={state.success ? undefined : state.message}
        success={state.success ? state.message : undefined}
      />
      <SubmitButton
        pending={pending}
        pendingLabel={isLogin ? "Signing in…" : "Creating account…"}
      >
        {isLogin ? "Sign in" : "Create account"}
      </SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    initialState,
  );
  const formRef = useFocusFirstError(state);
  return (
    <form
      action={formAction}
      aria-busy={pending}
      className={styles.form}
      noValidate
      ref={formRef}
    >
      <Field
        autoComplete="email"
        defaultValue={state.fields?.email}
        error={state.fieldErrors?.email}
        label="Email"
        maxLength={254}
        name="email"
        placeholder="you@example.com"
        required
        type="email"
      />
      <FormStatus
        error={state.success ? undefined : state.message}
        success={state.success ? state.message : undefined}
      />
      <SubmitButton pending={pending} pendingLabel="Sending link…">
        Send reset link
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(
    updatePassword,
    initialState,
  );
  const formRef = useFocusFirstError(state);
  return (
    <form
      action={formAction}
      aria-busy={pending}
      className={styles.form}
      noValidate
      ref={formRef}
    >
      <PasswordField
        autoComplete="new-password"
        error={state.fieldErrors?.password}
        hint="8 characters minimum"
        label="New password"
      />
      <FormStatus error={state.message} />
      <SubmitButton pending={pending} pendingLabel="Saving…">
        Save new password
      </SubmitButton>
    </form>
  );
}
