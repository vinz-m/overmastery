"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  ChartLineUpIcon,
  ClipboardTextIcon,
  HouseIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { SessionDayRefresh } from "@/features/sessions/session-day-refresh";
import styles from "./primary-nav.module.css";

type PrimaryDestination = "home" | "profile" | "progress" | "workouts";
const destinations = [
  { id: "home", href: "/", icon: HouseIcon, label: "Today" },
  { id: "workouts", href: "/workouts", icon: ClipboardTextIcon, label: "Workouts" },
  { id: "progress", href: "/progress", icon: ChartLineUpIcon, label: "Progress" },
  { id: "profile", href: "/profile", icon: UserIcon, label: "Profile" },
] as const;
export function PrimaryNav({ active, dayEndsAt }: { active: PrimaryDestination; activeSessionId?: string; dayEndsAt: string }) {
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
          aria-current={isActive ? "page" : undefined}
          className={isActive ? styles.activeNav : undefined}
        >
          {isActive && (
            <motion.span
              className={styles.activeIndicator}
              layoutId="primary-navigation-indicator"
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            />
          )}
          <Icon aria-hidden="true" size={21} weight={isActive ? "fill" : "regular"} />
          <small>{item.label}</small>
        </Link>
        );
      })}
    </nav>
    </>
  );
}
