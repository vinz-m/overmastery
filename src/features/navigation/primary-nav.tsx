"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  ChartLineUpIcon,
  ClipboardTextIcon,
  HouseIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { SessionDayRefresh } from "@/features/sessions/session-day-refresh";
import styles from "./primary-nav.module.css";
import { navTab } from "@/features/navigation/page-transition";

const destinations = [
  { id: "home", href: "/", icon: HouseIcon, label: "Today" },
  { id: "workouts", href: "/workouts", icon: ClipboardTextIcon, label: "Workouts" },
  { id: "progress", href: "/progress", icon: ChartLineUpIcon, label: "Progress" },
  { id: "profile", href: "/profile", icon: UserIcon, label: "Profile" },
] as const;

export function PrimaryNav({ dayEndsAt }: { dayEndsAt: string }) {
  const pathname = usePathname();
  const active = activeDestination(pathname);

  return (
    <>
    <SessionDayRefresh dayEndsAt={dayEndsAt} />
    <nav className={styles.nav} aria-label="Primary navigation">
      {destinations.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;
        return (
          <Link
          key={item.id}
          href={item.href}
          transitionTypes={navTab}
          aria-current={isActive ? "page" : undefined}
            className={isActive ? styles.activeNav : undefined}
          >
            <NavigationFeedback icon={Icon} isActive={isActive} label={item.label} />
          </Link>
        );
      })}
    </nav>
    </>
  );
}

function NavigationFeedback({
  icon: Icon,
  isActive,
  label,
}: {
  icon: typeof HouseIcon;
  isActive: boolean;
  label: string;
}) {
  const { pending } = useLinkStatus();
  const emphasized = isActive || pending;

  return (
    <>
      {isActive && (
        <motion.span
          className={styles.activeIndicator}
          layoutId="primary-navigation-indicator"
          transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
        />
      )}
      {pending && !isActive && (
        <span className={`${styles.activeIndicator} ${styles.pendingIndicator}`} />
      )}
      <Icon
        aria-hidden="true"
        className={emphasized ? styles.emphasized : undefined}
        size={21}
        weight={emphasized ? "fill" : "regular"}
      />
      <small className={emphasized ? styles.emphasized : undefined}>{label}</small>
      <span
        aria-hidden="true"
        className={`${styles.pendingSignal} ${pending ? styles.pendingSignalVisible : ""}`}
      />
    </>
  );
}

function activeDestination(pathname: string) {
  if (pathname.startsWith("/workouts")) return "workouts";
  if (pathname.startsWith("/progress")) return "progress";
  if (pathname.startsWith("/profile")) return "profile";
  return "home";
}
