import { redirect } from "next/navigation";

import { ActiveSessionScreen } from "@/features/sessions/active-session";
import { getSessionWorkspace } from "@/features/sessions/data";
import { closeExpiredSession } from "@/features/sessions/expire-session";
import { isSessionExpired } from "@/features/sessions/session-day";
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
  const [user, workspace] = await Promise.all([
    requireUser(),
    getSessionWorkspace(supabase, sessionId, userId),
  ]);

  if (!workspace) redirect("/");
  if (workspace.status === "completed") {
    redirect(`/sessions/${sessionId}/summary`);
  }
  if (workspace.status !== "active") redirect("/");
  // A workout left open past its lifetime is closed rather than resumed.
  if (isSessionExpired(workspace.session.startedAt)) {
    await closeExpiredSession(
      supabase,
      workspace.session.id,
      workspace.session.startedAt,
    );
    redirect("/");
  }

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
