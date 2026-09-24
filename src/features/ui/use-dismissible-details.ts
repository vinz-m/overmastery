"use client";

import { useEffect, useRef } from "react";

/**
 * Closes a <details> menu when the user taps outside it or presses Escape,
 * so an open menu doesn't stay layered over the controls beneath it.
 */
export function useDismissibleDetails() {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const details = ref.current;
    if (!details) return;

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (details.open && !details.contains(event.target as Node))
        details.open = false;
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !details.open) return;
      details.open = false;
      details.querySelector("summary")?.focus();
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return ref;
}
