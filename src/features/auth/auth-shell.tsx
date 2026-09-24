import type { ReactNode } from "react";

import { BrandLockup } from "@/features/ui/brand-lockup";

import styles from "./auth.module.css";

type AuthShellProps = {
  children: ReactNode;
  copy: string;
  /** Secondary route below the card, e.g. switching between sign in and sign up. */
  footer?: ReactNode;
  title: string;
};

export function AuthShell({ children, copy, footer, title }: AuthShellProps) {
  return (
    <main className={styles.page}>
      <div aria-hidden="true" className={styles.glow} />
      <div className={styles.column}>
        <header className={styles.brand}>
          <BrandLockup />
        </header>
        <section aria-labelledby="auth-title" className={styles.card}>
          <h1 id="auth-title">{title}</h1>
          <p className={styles.copy}>{copy}</p>
          {children}
        </section>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </main>
  );
}
