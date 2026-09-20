"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { MotionConfig } from "motion/react";

import { THEME_STORAGE_KEY } from "./theme";

export type ThemePreference = "dark" | "light" | "system";

const ThemeContext = createContext<{
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
} | null>(null);
const THEME_CHANGE_EVENT = "overmastery-theme-change";

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "dark" || value === "light" || value === "system";
}

function resolveTheme(preference: ThemePreference) {
  if (preference !== "system") return preference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(preference: ThemePreference) {
  const theme = resolveTheme(preference);
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const preference = useSyncExternalStore<ThemePreference>(
    subscribeToTheme,
    readThemePreference,
    () => "system" as const,
  );

  useEffect(() => {
    if (preference !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyTheme("system");
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [preference]);

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextPreference);
    } catch {
      // The visual preference still applies when storage is unavailable.
    }
    applyTheme(nextPreference);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  const value = useMemo(
    () => ({ preference, setPreference }),
    [preference, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>
      <MotionConfig
        reducedMotion="user"
        transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
      >
        {children}
      </MotionConfig>
    </ThemeContext.Provider>
  );
}

function subscribeToTheme(onStoreChange: () => void) {
  const handleStoreChange = () => {
    applyTheme(readThemePreference());
    onStoreChange();
  };
  window.addEventListener("storage", handleStoreChange);
  window.addEventListener(THEME_CHANGE_EVENT, handleStoreChange);
  return () => {
    window.removeEventListener("storage", handleStoreChange);
    window.removeEventListener(THEME_CHANGE_EVENT, handleStoreChange);
  };
}

function readThemePreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider.");
  return context;
}
