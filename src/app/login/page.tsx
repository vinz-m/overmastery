import { AuthForm } from "@/features/auth/auth-form";
import { AuthShell } from "@/features/auth/auth-shell";
import { redirectAuthenticatedUser } from "@/lib/auth/session";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ authError?: string }>;
}) {
  await redirectAuthenticatedUser();
  const { authError } = await searchParams;

  return (
    <AuthShell
      copy="Pick up where your last session left off. Your history, targets, and workout templates stay tied to your account."
      eyebrow="Return to training"
      title="Sign in. Keep building."
    >
      <AuthForm
        mode="login"
        notice={
          authError === "confirmation"
            ? "That confirmation link is invalid or has expired. Request a new email and try again."
            : undefined
        }
      />
    </AuthShell>
  );
}
