"use client";

import { useId, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CaretDownIcon } from "@phosphor-icons/react";

import styles from "./disclosure.module.css";

const MotionCaretDown = motion.create(CaretDownIcon);

export function Disclosure({
  children,
  className,
  contentClassName,
  defaultOpen = false,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  defaultOpen?: boolean;
  label: string;
}) {
  const contentId = useId();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={className} data-open={open}>
      <button
        aria-controls={contentId}
        aria-expanded={open}
        className={styles.summary}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>{label}</span>
        <MotionCaretDown
          animate={{ rotate: open ? 180 : 0 }}
          aria-hidden="true"
          initial={false}
          size={20}
          transition={{ type: "spring", duration: 0.3, bounce: 0 }}
          weight="bold"
        />
      </button>
      <Collapsible className={contentClassName} id={contentId} open={open}>
        {children}
      </Collapsible>
    </section>
  );
}

export function Collapsible({
  children,
  className,
  id,
  open,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  open: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const [hasSettledOpen, setHasSettledOpen] = useState(open);

  return (
    <motion.div
      animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
      aria-hidden={!open}
      className={styles.collapsible}
      data-overflow={open && hasSettledOpen ? "visible" : "clipped"}
      id={id}
      inert={!open}
      initial={false}
      onAnimationComplete={() => setHasSettledOpen(open)}
      transition={
        reduceMotion
          ? { duration: 0 }
          : {
              height: { duration: 0.22, ease: [0.2, 0, 0, 1] },
              opacity: { duration: 0.15, ease: "easeOut" },
            }
      }
    >
      <div className={className}>{children}</div>
    </motion.div>
  );
}
