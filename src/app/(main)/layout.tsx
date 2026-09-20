import type { ReactNode } from "react";

import { AppHeader } from "@/features/navigation/app-header";
import { PrimaryNav } from "@/features/navigation/primary-nav";
import { expirePreviousDaySession } from "@/features/sessions/expire-session";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import styles from "@/features/navigation/app-shell.module.css";

export default async function MainLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const supabase = await createClient();

  // This route-group layout persists while the user moves between primary tabs,
  // so the day-boundary check runs on app entry instead of blocking every tab.
  await expirePreviousDaySession(
    supabase,
    user.id,
    user.timeZone,
    new Date(),
  );

  const accountLabel = user.displayName || user.email?.split("@")[0] || "You";

  return (
    <div className={styles.page}>
      <section className={styles.shell}>
        <AppHeader accountLabel={accountLabel} />
        {children}
        <PrimaryNav dayEndsAt={user.dayEndsAt} />
      </section>
    </div>
  );
}
