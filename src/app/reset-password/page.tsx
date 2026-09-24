import type { Metadata } from "next";

import { ResetPasswordForm } from "@/features/auth/auth-form";
import { AuthShell } from "@/features/auth/auth-shell";
import { requireUserId } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  // Reached from the reset email, which signs the user in for this step.
  // Without that session the link has expired, so send them to sign in.
  await requireUserId();

  return (
    <AuthShell
      copy="Choose a new password for your account. You’ll stay signed in on this device."
      title="Choose a new password."
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
