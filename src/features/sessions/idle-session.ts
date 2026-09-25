import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

import { expireStaleSession } from "./expire-session";

/**
 * One idle-session check per request. The layout and the pages that show the
 * active session render in parallel, so pages await this shared check before
 * reading it; otherwise they could show a workout the layout is closing.
 */
export const closeIdleSession = cache(async (userId: string) =>
  expireStaleSession(await createClient(), userId),
);
