import { redirect } from "next/navigation";

import { SessionSummary } from "@/features/sessions/session-summary";
import { getSessionWorkspace } from "@/features/sessions/data";
import { requireUser, requireUserId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageTransition } from "@/features/navigation/page-transition";

export default async function SessionSummaryPage({
  params,
}: PageProps<"/sessions/[sessionId]/summary">) {
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
  if (workspace.status === "active") redirect(`/sessions/${sessionId}`);
  if (workspace.status !== "completed") redirect("/");

  return (
    <PageTransition>
      <SessionSummary
        session={workspace.session}
        unitSystem={user.unitSystem}
      />
    </PageTransition>
  );
}
