import Link from "next/link";

import { AuthForm } from "@/features/auth/auth-form";
import { AuthShell } from "@/features/auth/auth-shell";
import { redirectAuthenticatedUser } from "@/lib/auth/session";

export default async function SignupPage() {
  await redirectAuthenticatedUser();

  return (
    <AuthShell
      copy="Log every set, see what changed, and always know the line to beat next time."
      footer={
        <>
          Already have an account? <Link href="/login">Sign in</Link>
        </>
      }
      title="Make every set count."
    >
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
