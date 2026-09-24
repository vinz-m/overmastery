import type { ReactNode } from "react";

import { BrandLockup } from "./brand-lockup";
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
          <BrandLockup />
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
