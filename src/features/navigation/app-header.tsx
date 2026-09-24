import Link from "next/link";
import styles from "./app-header.module.css";
import { navTab } from "@/features/navigation/page-transition";

export function AppHeader({ accountLabel = "You" }: { accountLabel?: string }) {
  return (
    <header className={styles.header}>
      <Link
        className={styles.brand}
        href="/"
        aria-label="Overmastery home"
        transitionTypes={navTab}
      >
        <span aria-hidden="true" className={styles.mark} />
        <span>
          <span className={styles.wordOver}>over</span>
          <span className={styles.wordMastery}>mastery</span>
        </span>
      </Link>
      <Link
        className={styles.avatar}
        href="/profile"
        transitionTypes={navTab}
        aria-label="Open your profile"
        title="Your profile"
      >
        {accountLabel.slice(0, 2).toUpperCase()}
      </Link>
    </header>
  );
}
