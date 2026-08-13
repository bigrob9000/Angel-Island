"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  savePreferences,
  shouldReduceMotion,
  type UserPreferences,
} from "@/lib/preferences";

type PreferencesContextValue = {
  preferences: UserPreferences;
  setPreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  motionReduced: boolean;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function applyDocumentClasses(prefs: UserPreferences): void {
  const root = document.documentElement;
  root.classList.toggle("calm-mode", prefs.calmMode);
  root.classList.toggle("reduce-motion", shouldReduceMotion(prefs));
  root.classList.toggle("easier-reading", prefs.calmMode && prefs.easierReadingFont);
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const prefs = loadPreferences();
    setPreferences(prefs);
    applyDocumentClasses(prefs);
    setReady(true);

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMediaChange = () => {
      setPreferences((prev) => {
        applyDocumentClasses(prev);
        return prev;
      });
    };
    media.addEventListener("change", onMediaChange);
    return () => media.removeEventListener("change", onMediaChange);
  }, []);

  const setPreference = useCallback(<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPreferences((prev) => {
      const next = { ...prev, [key]: value };
      savePreferences(next);
      applyDocumentClasses(next);
      return next;
    });
  }, []);

  const motionReduced = shouldReduceMotion(preferences);

  const value = useMemo(
    () => ({ preferences, setPreference, motionReduced }),
    [preferences, setPreference, motionReduced]
  );

  if (!ready) {
    return <>{children}</>;
  }

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    return {
      preferences: DEFAULT_PREFERENCES,
      setPreference: () => {},
      motionReduced: false,
    };
  }
  return ctx;
}
