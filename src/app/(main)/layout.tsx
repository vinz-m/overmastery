import type { ReactNode } from "react";

import { AppHeader } from "@/features/navigation/app-header";
import { PrimaryNav } from "@/features/navigation/primary-nav";
import { DeviceTimeZoneSync } from "@/features/profile/device-time-zone-sync";
import { closeIdleSession } from "@/features/sessions/idle-session";
import { requireUser } from "@/lib/auth/session";

import styles from "@/features/navigation/app-shell.module.css";

export default async function MainLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();

  // This route-group layout persists while the user moves between primary tabs,
  // so the idle-session check runs on app entry instead of blocking every tab.
  await closeIdleSession(user.id);

  const accountLabel = user.displayName || user.email?.split("@")[0] || "You";

  return (
    <div className={styles.page}>
      <section className={styles.shell}>
        <AppHeader accountLabel={accountLabel} />
        {children}
        <PrimaryNav dayEndsAt={user.dayEndsAt} />
        {user.timeZone === "UTC" && <DeviceTimeZoneSync />}
      </section>
    </div>
  );
}
