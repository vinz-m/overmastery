"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react";

import styles from "./select-field.module.css";

const MotionCaretDown = motion.create(CaretDownIcon);

export type SelectOption = {
  label: string;
  value: string;
};

export function SelectField({
  ariaLabel,
  defaultValue,
  disabled = false,
  form,
  name,
  onValueChange,
  options,
  value,
}: {
  ariaLabel: string;
  defaultValue?: string;
  disabled?: boolean;
  form?: string;
  name?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  value?: string;
}) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? options[0]?.value ?? "",
  );
  const [open, setOpen] = useState(false);
  const selectedValue = value ?? internalValue;
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === selectedValue),
  );
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const selectedOption = options[selectedIndex];

  useEffect(() => {
    if (!open) return;

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsidePress);
  }, [open]);

  function openMenu(index = selectedIndex) {
    if (disabled) return;
    setActiveIndex(index);
    setOpen(true);
    window.requestAnimationFrame(() => listboxRef.current?.focus());
  }

  function closeMenu({ restoreFocus = true } = {}) {
    setOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }

  function choose(index: number) {
    const option = options[index];
    if (!option) return;
    if (value === undefined) setInternalValue(option.value);
    onValueChange?.(option.value);
    closeMenu();
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex =
        event.key === "ArrowDown"
          ? Math.min(options.length - 1, selectedIndex + 1)
          : Math.max(0, selectedIndex - 1);
      openMenu(nextIndex);
    }
  }

  function handleListboxKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    }
    if (event.key === "Tab") {
      closeMenu({ restoreFocus: false });
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActiveIndex(event.key === "Home" ? 0 : options.length - 1);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => {
        const offset = event.key === "ArrowDown" ? 1 : -1;
        return (current + offset + options.length) % options.length;
      });
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(activeIndex);
    }
  }

  return (
    <div className={styles.root} data-open={open} ref={rootRef}>
      {name && (
        <input
          disabled={disabled}
          form={form}
          name={name}
          type="hidden"
          value={selectedValue}
        />
      )}
      <button
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className={styles.trigger}
        disabled={disabled}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={handleTriggerKeyDown}
        ref={triggerRef}
        type="button"
      >
        <span>{selectedOption?.label ?? "Choose an option"}</span>
        <MotionCaretDown
          animate={{ rotate: open ? 180 : 0 }}
          aria-hidden="true"
          initial={false}
          size={20}
          transition={{ type: "spring", duration: 0.3, bounce: 0 }}
          weight="bold"
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            aria-activedescendant={`${listboxId}-option-${activeIndex}`}
            aria-label={ariaLabel}
            className={styles.menu}
            exit={{ opacity: 0, y: -4 }}
            id={listboxId}
            initial={{ opacity: 0, y: -4 }}
            onKeyDown={handleListboxKeyDown}
            ref={listboxRef}
            role="listbox"
            tabIndex={-1}
            transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
          >
            {options.map((option, index) => {
              const selected = option.value === selectedValue;
              return (
                <button
                  aria-selected={selected}
                  className={
                    index === activeIndex ? styles.activeOption : undefined
                  }
                  id={`${listboxId}-option-${index}`}
                  key={option.value}
                  onClick={() => choose(index)}
                  onMouseMove={() => setActiveIndex(index)}
                  role="option"
                  type="button"
                >
                  <span>{option.label}</span>
                  {selected ? (
                    <CheckIcon aria-hidden="true" size={18} weight="bold" />
                  ) : (
                    <span aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
