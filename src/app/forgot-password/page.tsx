import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "@/features/auth/auth-form";
import { AuthShell } from "@/features/auth/auth-shell";
import { redirectAuthenticatedUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Reset password" };

export default async function ForgotPasswordPage() {
  await redirectAuthenticatedUser();

  return (
    <AuthShell
      copy="Enter your account email and we’ll send a link to choose a new password."
      footer={
        <>
          Remembered it? <Link href="/login">Back to sign in</Link>
        </>
      }
      title="Reset your password."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
