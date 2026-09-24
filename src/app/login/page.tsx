import Link from "next/link";

import { AuthForm } from "@/features/auth/auth-form";
import { AuthShell } from "@/features/auth/auth-shell";
import { redirectAuthenticatedUser } from "@/lib/auth/session";

const notices: Record<string, string> = {
  confirmation:
    "That confirmation link is invalid or has expired. Request a new email and try again.",
  reset: "That reset link is invalid or has expired. Request a new one below.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ authError?: string }>;
}) {
  await redirectAuthenticatedUser();
  const { authError } = await searchParams;

  return (
    <AuthShell
      copy="Pick up where your last session left off."
      footer={
        <>
          New to Overmastery? <Link href="/signup">Create an account</Link>
        </>
      }
      title="Welcome back."
    >
      <AuthForm
        mode="login"
        notice={authError ? notices[authError] : undefined}
      />
    </AuthShell>
  );
}
