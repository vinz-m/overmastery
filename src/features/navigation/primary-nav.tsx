import Link from "next/link";
import { SessionDayRefresh } from "@/features/sessions/session-day-refresh";
import styles from "./primary-nav.module.css";

type PrimaryDestination = "home" | "profile" | "progress" | "workouts" | "session";
const destinations = [
  { id: "home", href: "/", label: "Home", path: "m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" },
  { id: "workouts", href: "/workouts", label: "Workouts", path: "M8 5H5v16h14V5h-3M9 3h6v4H9zM8 12h8M8 16h5" },
  { id: "train", href: "/workouts", label: "Train", path: "m9 5 11 7-11 7z" },
  { id: "progress", href: "/progress", label: "Progress", path: "M4 4v16h16M8 15l4-5 4 2 4-7" },
  { id: "profile", href: "/profile", label: "Profile", path: "M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0" },
] as const;
export function PrimaryNav({ active, activeSessionId, dayEndsAt }: { active: PrimaryDestination; activeSessionId?: string; dayEndsAt: string }) {
  return (
    <>
    <SessionDayRefresh dayEndsAt={dayEndsAt} />
    <nav className={styles.nav} aria-label="Primary navigation">
      {destinations.map((item) => (
        <Link
          key={item.id}
          href={item.id === "train" && activeSessionId ? `/sessions/${activeSessionId}` : item.href}
          aria-current={item.id === "train" && active === "session" ? "page" : active === item.id ? "page" : undefined}
          aria-label={item.id === "train" ? activeSessionId ? "Resume active session" : "Choose a workout to train" : undefined}
          className={item.id === "train" ? active === "session" ? styles.activeNav : styles.trainNav : active === item.id ? styles.activeNav : undefined}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={item.path} /></svg>
          <small>{item.id === "train" && activeSessionId ? "Resume" : item.label}</small>
        </Link>
      ))}
    </nav>
    </>
  );
}
export function PlanningSwitch({ active }: { active: "exercises" | "workouts" }) {
  return (
    <nav className={styles.planningSwitch} aria-label="Planning library">
      <Link aria-current={active === "workouts" ? "page" : undefined} className={active === "workouts" ? styles.currentPlanningView : undefined} href="/workouts">Workout templates</Link>
      <Link aria-current={active === "exercises" ? "page" : undefined} className={active === "exercises" ? styles.currentPlanningView : undefined} href="/exercises">Exercise library</Link>
    </nav>
  );
}
