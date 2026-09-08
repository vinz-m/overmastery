import { AuthForm } from "@/features/auth/auth-form";
import { AuthShell } from "@/features/auth/auth-shell";
import { redirectAuthenticatedUser } from "@/lib/auth/session";

export default async function SignupPage() {
  await redirectAuthenticatedUser();

  return (
    <AuthShell
      copy="Build a training record that remembers the work, shows what changed, and gives every session a clear line to beat."
      eyebrow="Start your record"
      title="Make every set count."
    >
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
