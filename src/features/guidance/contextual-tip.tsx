"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { recordGuidance } from "./actions";
import type { GuidanceKey } from "./model";
import styles from "./contextual-tip.module.css";

export function ContextualTip({
  body,
  guidanceKey,
  title,
}: {
  body: string;
  guidanceKey: GuidanceKey;
  title: string;
}) {
  const [visible, setVisible] = useState(true);
  const [saveFailed, setSaveFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const reduceMotion = useReducedMotion();

  function dismiss() {
    setSaveFailed(false);
    startTransition(async () => {
      const saved = await recordGuidance(guidanceKey, "dismissed");
      if (saved) setVisible(false);
      else setSaveFailed(true);
    });
  }

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.aside
          animate={{ opacity: 1, y: 0 }}
          aria-label={`${title} onboarding tip`}
          className={styles.tip}
          exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
          initial={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
          transition={{ duration: reduceMotion ? 0 : 0.12, ease: "easeOut" }}
        >
          <div>
            <span>Getting started</span>
            <strong>{title}</strong>
            <p>{body}</p>
          </div>
          <button disabled={pending} onClick={dismiss} type="button">
            {pending ? "Hiding…" : "Hide tip"}
          </button>
          {saveFailed && (
            <p className={styles.error} role="alert">
              Unable to hide this tip. Try again.
            </p>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
