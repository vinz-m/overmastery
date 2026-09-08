import { redirect } from "next/navigation";

import { SessionSummary } from "@/features/sessions/session-summary";
import { getSessionWorkspace } from "@/features/sessions/data";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function SessionSummaryPage({
  params,
}: PageProps<"/sessions/[sessionId]/summary">) {
  const { sessionId } = await params;
  const user = await requireUser();
  const supabase = await createClient();
  const workspace = await getSessionWorkspace(supabase, sessionId, user.id);

  if (!workspace) redirect("/");
  if (workspace.status === "active") redirect(`/sessions/${sessionId}`);
  if (workspace.status !== "completed") redirect("/");

  return <SessionSummary session={workspace.session} unitSystem={user.unitSystem} />;
}
