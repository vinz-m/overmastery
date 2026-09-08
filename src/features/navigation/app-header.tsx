import Link from "next/link";
import styles from "./app-header.module.css";

export function AppHeader({ accountLabel = "You" }: { accountLabel?: string }) {
  return (
    <header className={styles.header}>
      <Link className={styles.brand} href="/" aria-label="Overmastery home">
        <svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M5 20V12a9 9 0 0 1 18 0v8M10 20v-8a4 4 0 0 1 8 0v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        <span>overmastery<span className={styles.dot}>.</span></span>
      </Link>
      <Link className={styles.avatar} href="/profile" aria-label="Open your profile" title="Your profile">{accountLabel.slice(0, 2).toUpperCase()}</Link>
    </header>
  );
}
