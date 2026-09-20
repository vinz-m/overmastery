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
