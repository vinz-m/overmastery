import type { ReactNode } from "react";
import { ArrowRightIcon } from "@phosphor-icons/react/ssr";

import styles from "./auth.module.css";

type AuthShellProps = {
  children: ReactNode;
  eyebrow: string;
  title: string;
  copy: string;
};

export function AuthShell({ children, eyebrow, title, copy }: AuthShellProps) {
  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <aside className={styles.ledger}>
          <header>
            <strong>overmastery.</strong>
            <span>Your personal record</span>
          </header>

          <div className={styles.ledgerBody}>
            <p>Small steps. A longer story.</p>
            <div className={styles.progression} aria-hidden="true">
              <div>
                <span>Previous</span>
                <strong>80</strong>
                <small>kg · 8 / 8 / 7</small>
              </div>
              <i>
                <ArrowRightIcon aria-hidden="true" size={18} weight="bold" />
              </i>
              <div>
                <span>Today</span>
                <strong>80</strong>
                <small>kg · 8 / 8 / 8</small>
              </div>
              <i>
                <ArrowRightIcon aria-hidden="true" size={18} weight="bold" />
              </i>
              <div className={styles.nextMark}>
                <span>Next</span>
                <strong>82.5</strong>
                <small>kg · your next step</small>
              </div>
            </div>
          </div>

          <footer>
            <span>A little more familiar.</span>
            <span>Every time you return.</span>
          </footer>
        </aside>

        <section className={styles.entry}>
          <div className={styles.entryInner}>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h1>{title}</h1>
            <p className={styles.copy}>{copy}</p>
            {children}
          </div>
        </section>
      </section>
    </main>
  );
}
