import { getProgressOverview } from "@/features/progress/data";
import { ProgressHome } from "@/features/progress/progress-home";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function ProgressPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { exercises, sessions } = await getProgressOverview(
    supabase,
    user.id,
    user.unitSystem,
  );

  return (
    <ProgressHome
      exercises={exercises}
      guidance={user.guidance}
      sessions={sessions}
      unitSystem={user.unitSystem}
    />
  );
}
