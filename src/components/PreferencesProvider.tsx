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
import { usePathname } from "next/navigation";
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  savePreferences,
  shouldReduceMotion,
  type UserPreferences,
} from "@/lib/preferences";
import { APP_THEMES, DEFAULT_APP_THEME } from "@/lib/app-theme";
import { shouldApplyUserTheme } from "@/lib/theme-scope";

type PreferencesContextValue = {
  preferences: UserPreferences;
  setPreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  motionReduced: boolean;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function applyDocumentClasses(prefs: UserPreferences, pathname: string): void {
  const root = document.documentElement;
  const useSavedTheme = shouldApplyUserTheme(pathname);
  root.classList.toggle("calm-mode", prefs.calmMode);
  root.classList.toggle("reduce-motion", shouldReduceMotion(prefs));
  root.classList.toggle("easier-reading", prefs.calmMode && prefs.easierReadingFont);
  for (const theme of APP_THEMES) {
    root.classList.toggle(
      `theme-${theme}`,
      useSavedTheme ? prefs.appTheme === theme : theme === DEFAULT_APP_THEME,
    );
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPreferences(loadPreferences());
    setReady(true);
  }, []);

  useEffect(() => {
    applyDocumentClasses(preferences, pathname);
  }, [preferences, pathname]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMediaChange = () => {
      setPreferences((prev) => {
        applyDocumentClasses(prev, pathname);
        return prev;
      });
    };
    media.addEventListener("change", onMediaChange);
    return () => media.removeEventListener("change", onMediaChange);
  }, [pathname]);

  const setPreference = useCallback(<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPreferences((prev) => {
      const next = { ...prev, [key]: value };
      savePreferences(next);
      applyDocumentClasses(next, pathname);
      return next;
    });
  }, [pathname]);

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
