"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { requireUserId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = {
  fieldErrors?: {
    displayName?: string;
    email?: string;
    password?: string;
  };
  /**
   * What the user typed, echoed back so a failed submit doesn't wipe it:
   * React resets the form after every action. Never includes the password.
   */
  fields?: {
    displayName?: string;
    email?: string;
  };
  message?: string;
  success?: boolean;
};

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
    password: String(formData.get("password") ?? ""),
  };
}

function validEmail(email: string) {
  return /^\S+@\S+\.\S+$/.test(email);
}

function validateCredentials(email: string, password: string) {
  const fieldErrors: AuthActionState["fieldErrors"] = {};

  if (!validEmail(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  if (password.length < 8) {
    fieldErrors.password = "Use at least 8 characters.";
  }

  return fieldErrors;
}

/** Where auth emails should link back to: this deployment's confirm route. */
async function confirmUrl(next?: string) {
  const origin = (await headers()).get("origin");
  if (!origin) return undefined;
  const url = new URL("/auth/confirm", origin);
  if (next) url.searchParams.set("next", next);
  return url.toString();
}

export async function signIn(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const { email, password } = readCredentials(formData);
  const fields = { email };
  const fieldErrors = validateCredentials(email, password);

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, fields };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      fields,
      message: "That email and password combination was not recognized.",
    };
  }

  redirect("/");
}

export async function signUp(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const displayName = String(formData.get("displayName") ?? "").trim();
  const { email, password } = readCredentials(formData);
  const fields = { displayName, email };
  const fieldErrors = validateCredentials(email, password);

  if (displayName.length < 2 || displayName.length > 80) {
    fieldErrors.displayName = "Use between 2 and 80 characters.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, fields };
  }

  const emailRedirectTo = await confirmUrl();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      ...(emailRedirectTo ? { emailRedirectTo } : {}),
    },
  });

  if (error) {
    return {
      fields,
      message:
        error.code === "user_already_exists"
          ? "An account with that email already exists. Sign in instead."
          : error.message === "fetch failed"
            ? "The authentication service could not be reached. Try again in a moment."
            : "Your account could not be created. Check the details and try again.",
    };
  }

  if (data.session) {
    redirect("/");
  }

  return {
    fields,
    message: "Check your inbox to confirm your email, then return to sign in.",
    success: true,
  };
}

export async function requestPasswordReset(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const { email } = readCredentials(formData);
  const fields = { email };

  if (!validEmail(email)) {
    return { fieldErrors: { email: "Enter a valid email address." }, fields };
  }

  const redirectTo = await confirmUrl("/reset-password");
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    ...(redirectTo ? { redirectTo } : {}),
  });

  if (error?.code === "over_email_send_rate_limit" || error?.status === 429) {
    return {
      fields,
      message:
        "Too many reset emails were requested. Wait a few minutes and try again.",
    };
  }
  if (error?.message === "fetch failed") {
    return {
      fields,
      message:
        "The authentication service could not be reached. Try again in a moment.",
    };
  }

  // Same answer whether or not the account exists, so this form can't be used
  // to find out which emails are registered.
  return {
    fields,
    message:
      "If an account uses that email, a reset link is on its way. It expires in an hour.",
    success: true,
  };
}

export async function updatePassword(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  // The reset link signs the user in, so this page only works from that link.
  await requireUserId();
  const password = String(formData.get("password") ?? "");

  if (password.length < 8) {
    return { fieldErrors: { password: "Use at least 8 characters." } };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return {
      message:
        error.code === "same_password"
          ? "Choose a password you haven’t used for this account."
          : error.code === "weak_password"
            ? "That password is too easy to guess. Try a longer one."
            : "Your password could not be updated. Request a new reset link and try again.",
    };
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
