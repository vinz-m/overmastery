import { notFound } from "next/navigation";

import { getHistorySession } from "@/features/progress/data";
import { SessionHistoryDetail } from "@/features/progress/history-detail";
import { requireUser, requireUserId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageTransition } from "@/features/navigation/page-transition";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function HistoricalSessionPage({
  params,
}: PageProps<"/progress/sessions/[sessionId]">) {
  const { sessionId } = await params;
  if (!uuidPattern.test(sessionId)) notFound();

  const [userId, supabase] = await Promise.all([
    requireUserId(),
    createClient(),
  ]);
  const userPromise = requireUser();
  const [user, session] = await Promise.all([
    userPromise,
    getHistorySession(
      supabase,
      userId,
      sessionId,
      userPromise.then((user) => user.unitSystem),
    ),
  ]);
  if (!session) notFound();

  return (
    <PageTransition>
      <SessionHistoryDetail session={session} unitSystem={user.unitSystem} />
    </PageTransition>
  );
}
