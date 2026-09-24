"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type AuthActionState = {
  fieldErrors?: {
    displayName?: string;
    email?: string;
    password?: string;
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

function validateCredentials(email: string, password: string) {
  const fieldErrors: AuthActionState["fieldErrors"] = {};

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  if (password.length < 8) {
    fieldErrors.password = "Use at least 8 characters.";
  }

  return fieldErrors;
}

export async function signIn(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const { email, password } = readCredentials(formData);
  const fieldErrors = validateCredentials(email, password);

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
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
  const fieldErrors = validateCredentials(email, password);

  if (displayName.length < 2 || displayName.length > 80) {
    fieldErrors.displayName = "Use between 2 and 80 characters.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      ...(origin ? { emailRedirectTo: `${origin}/auth/confirm` } : {}),
    },
  });

  if (error) {
    return {
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
    message: "Check your inbox to confirm your email, then return to sign in.",
    success: true,
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
