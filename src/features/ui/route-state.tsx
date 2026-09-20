import type { ReactNode } from "react";

import styles from "./route-state.module.css";

type RouteStateProps = {
  actions?: ReactNode;
  children?: ReactNode;
  description: string;
  status: string;
  title: string;
};

export function RouteState({
  actions,
  children,
  description,
  status,
  title,
}: RouteStateProps) {
  return (
    <main className={styles.page}>
      <section className={styles.shell} aria-labelledby="route-state-title">
        <header className={styles.header}>
          <span className={styles.mark} aria-hidden="true">
            <svg viewBox="0 0 28 28" fill="none">
              <path
                d="M5 20V12a9 9 0 0 1 18 0v8M10 20v-8a4 4 0 0 1 8 0v8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className={styles.brand}>overmastery<span>.</span></span>
        </header>

        <div className={styles.content}>
          <p className={styles.status}>{status}</p>
          <h1 id="route-state-title">{title}</h1>
          <p className={styles.description}>{description}</p>
          {children}
          {actions ? <div className={styles.actions}>{actions}</div> : null}
        </div>
      </section>
    </main>
  );
}

export { styles as routeStateStyles };
