import { redirect } from "next/navigation";

import { ActiveSessionScreen } from "@/features/sessions/active-session";
import { getSessionWorkspace } from "@/features/sessions/data";
import { requireUser, requireUserId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function ActiveSessionPage({
  params,
}: PageProps<"/sessions/[sessionId]">) {
  const { sessionId } = await params;
  const [userId, supabase] = await Promise.all([requireUserId(), createClient()]);
  const [user, workspace] = await Promise.all([
    requireUser(),
    getSessionWorkspace(supabase, sessionId, userId),
  ]);

  if (!workspace) redirect("/");
  if (workspace.status === "completed") {
    redirect(`/sessions/${sessionId}/summary`);
  }
  if (workspace.status !== "active") redirect("/");

  return (
    <ActiveSessionScreen
      dayEndsAt={user.dayEndsAt}
      catalog={workspace.catalog}
      session={workspace.session}
      unitSystem={user.unitSystem}
    />
  );
}
