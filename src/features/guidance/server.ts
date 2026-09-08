import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

import {
  guidanceKeys,
  readGuidanceState,
  type GuidanceKey,
  type GuidanceOutcome,
} from "./model";

export async function updateGuidanceMetadata(
  keys: GuidanceKey[],
  outcome: GuidanceOutcome,
  existingClient?: SupabaseClient<Database>,
) {
  const validKeys = new Set<string>(guidanceKeys);
  const safeKeys = keys.filter((key) => validKeys.has(key));
  if (safeKeys.length === 0) return;

  const supabase = existingClient ?? (await createClient());
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return;

  const current = readGuidanceState(data.user.user_metadata);
  const next = {
    completed: new Set(current.completed),
    dismissed: new Set(current.dismissed),
  };

  safeKeys.forEach((key) => {
    next.completed.delete(key);
    next.dismissed.delete(key);
    next[outcome].add(key);
  });

  await supabase.auth.updateUser({
    data: {
      ...data.user.user_metadata,
      overmastery_guidance: {
        completed: [...next.completed],
        dismissed: [...next.dismissed],
      },
    },
  });
}
