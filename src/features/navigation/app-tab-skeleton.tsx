import styles from "./app-shell.module.css";

export function AppTabSkeleton() {
  return (
    <main className={styles.loading} aria-busy="true" aria-live="polite">
      <span className={styles.visuallyHidden}>Loading this section</span>
      <div aria-hidden="true">
        <div className={styles.loadingHeading} />
        <div className={styles.loadingLine} />
        <div className={styles.loadingPanel} />
        <div className={styles.loadingRows}>
          <div className={styles.loadingRow} />
          <div className={styles.loadingRow} />
          <div className={styles.loadingRow} />
        </div>
      </div>
    </main>
  );
}

/** Skeleton for full-screen detail pages that sit outside the tab shell. */
export function DetailSkeleton() {
  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <AppTabSkeleton />
      </div>
    </div>
  );
}
