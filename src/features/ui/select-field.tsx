"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CaretDownIcon, CheckIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";

import styles from "./select-field.module.css";

const MotionCaretDown = motion.create(CaretDownIcon);

export type SelectOption = {
  label: string;
  value: string;
  /** Extra words matched by search but not shown, e.g. the raw zone id. */
  keywords?: string;
};

export function SelectField({
  ariaLabel,
  defaultValue,
  disabled = false,
  form,
  name,
  onValueChange,
  options,
  searchable = false,
  searchPlaceholder = "Search",
  value,
}: {
  ariaLabel: string;
  defaultValue?: string;
  disabled?: boolean;
  form?: string;
  name?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  /** Adds a filter box for long lists (e.g. time zones). */
  searchable?: boolean;
  searchPlaceholder?: string;
  value?: string;
}) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? options[0]?.value ?? "",
  );
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedValue = value ?? internalValue;
  const selectedOption = options.find((option) => option.value === selectedValue) ?? options[0];

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleOptions = searchable && normalizedQuery
    ? options.filter((option) =>
        `${option.label} ${option.keywords ?? ""}`.toLocaleLowerCase().includes(normalizedQuery),
      )
    : options;
  const selectedVisibleIndex = Math.max(
    0,
    visibleOptions.findIndex((option) => option.value === selectedValue),
  );
  const [activeIndex, setActiveIndex] = useState(selectedVisibleIndex);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsidePress);
  }, [open]);

  const optionId = (index: number) => `${listboxId}-option-${index}`;
  const revealOption = (index: number) =>
    window.requestAnimationFrame(() =>
      document.getElementById(optionId(index))?.scrollIntoView({ block: "nearest" }),
    );

  function openMenu(index = selectedVisibleIndex) {
    if (disabled) return;
    setQuery("");
    setActiveIndex(index);
    setOpen(true);
    window.requestAnimationFrame(() =>
      (searchable ? searchRef.current : listboxRef.current)?.focus(),
    );
    // Long lists open at the current choice rather than the top.
    revealOption(index);
  }

  function closeMenu({ restoreFocus = true } = {}) {
    setOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }

  function choose(index: number) {
    const option = visibleOptions[index];
    if (!option) return;
    if (value === undefined) setInternalValue(option.value);
    onValueChange?.(option.value);
    closeMenu();
  }

  function moveActive(next: number) {
    setActiveIndex(next);
    revealOption(next);
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex =
        event.key === "ArrowDown"
          ? Math.min(options.length - 1, selectedVisibleIndex + 1)
          : Math.max(0, selectedVisibleIndex - 1);
      openMenu(nextIndex);
    }
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLElement>) {
    const count = visibleOptions.length;
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    }
    if (event.key === "Tab") {
      closeMenu({ restoreFocus: false });
      return;
    }
    if (count === 0) return;
    if ((event.key === "Home" || event.key === "End") && !searchable) {
      event.preventDefault();
      moveActive(event.key === "Home" ? 0 : count - 1);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const offset = event.key === "ArrowDown" ? 1 : -1;
      moveActive((activeIndex + offset + count) % count);
      return;
    }
    // In the search box a space is part of the query, not a selection.
    if (event.key === "Enter" || (event.key === " " && !searchable)) {
      event.preventDefault();
      choose(activeIndex);
    }
  }

  const activeDescendant = visibleOptions.length > 0 ? optionId(activeIndex) : undefined;

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
            className={searchable ? `${styles.menu} ${styles.searchableMenu}` : styles.menu}
            exit={{ opacity: 0, y: -4 }}
            initial={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
          >
            {searchable && (
              <label className={styles.search}>
                <MagnifyingGlassIcon aria-hidden="true" size={16} />
                <input
                  aria-activedescendant={activeDescendant}
                  aria-autocomplete="list"
                  aria-controls={listboxId}
                  aria-expanded
                  aria-label={`Search ${ariaLabel.toLocaleLowerCase()}`}
                  autoCapitalize="none"
                  autoComplete="off"
                  enterKeyHint="done"
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActiveIndex(0);
                    listboxRef.current?.scrollTo({ top: 0 });
                  }}
                  onKeyDown={handleMenuKeyDown}
                  placeholder={searchPlaceholder}
                  ref={searchRef}
                  role="combobox"
                  spellCheck={false}
                  type="search"
                  value={query}
                />
              </label>
            )}
            <div
              aria-activedescendant={searchable ? undefined : activeDescendant}
              aria-label={ariaLabel}
              className={styles.options}
              id={listboxId}
              onKeyDown={searchable ? undefined : handleMenuKeyDown}
              ref={listboxRef}
              role="listbox"
              tabIndex={searchable ? undefined : -1}
            >
              {visibleOptions.length === 0 && (
                <p className={styles.empty}>No matches for “{query.trim()}”.</p>
              )}
              {visibleOptions.map((option, index) => {
                const selected = option.value === selectedValue;
                return (
                  <button
                    aria-selected={selected}
                    className={index === activeIndex ? styles.activeOption : undefined}
                    id={optionId(index)}
                    key={option.value}
                    onClick={() => choose(index)}
                    onMouseMove={() => setActiveIndex(index)}
                    role="option"
                    tabIndex={-1}
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
