import { notFound } from "next/navigation";

import { getHistorySession } from "@/features/progress/data";
import { SessionHistoryDetail } from "@/features/progress/history-detail";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function HistoricalSessionPage({
  params,
}: PageProps<"/progress/sessions/[sessionId]">) {
  const { sessionId } = await params;
  if (!uuidPattern.test(sessionId)) notFound();

  const user = await requireUser();
  const supabase = await createClient();
  const session = await getHistorySession(supabase, user.id, sessionId, user.unitSystem);
  if (!session) notFound();

  return <SessionHistoryDetail session={session} unitSystem={user.unitSystem} />;
}
