import { redirect } from "next/navigation";

import { ActiveSessionScreen } from "@/features/sessions/active-session";
import { getSessionWorkspace } from "@/features/sessions/data";
import { expireStaleSession } from "@/features/sessions/expire-session";
import { requireUser, requireUserId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageTransition } from "@/features/navigation/page-transition";

export default async function ActiveSessionPage({
  params,
}: PageProps<"/sessions/[sessionId]">) {
  const { sessionId } = await params;
  const [userId, supabase] = await Promise.all([
    requireUserId(),
    createClient(),
  ]);
  const [user, workspace, expired] = await Promise.all([
    requireUser(),
    getSessionWorkspace(supabase, sessionId, userId),
    // A workout that went idle is closed rather than resumed.
    expireStaleSession(supabase, userId),
  ]);

  if (expired?.id === sessionId) {
    redirect(
      expired.outcome === "completed" ? `/sessions/${sessionId}/summary` : "/",
    );
  }
  if (!workspace) redirect("/");
  if (workspace.status === "completed") {
    redirect(`/sessions/${sessionId}/summary`);
  }
  if (workspace.status !== "active") redirect("/");

  return (
    <PageTransition>
      <ActiveSessionScreen
        catalog={workspace.catalog}
        session={workspace.session}
        unitSystem={user.unitSystem}
      />
    </PageTransition>
  );
}
