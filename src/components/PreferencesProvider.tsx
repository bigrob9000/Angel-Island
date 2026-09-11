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
import {
  loadProfilePreferences,
  saveProfilePreferences,
} from "@/lib/profile-preferences";
import { APP_THEMES, DEFAULT_APP_THEME } from "@/lib/app-theme";
import { shouldApplyUserTheme } from "@/lib/theme-scope";
import { createClient } from "@/lib/supabase";

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
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const local = loadPreferences();
    setPreferences(local);
    savePreferences(local);
    setReady(true);

    const supabase = createClient();

    async function syncForUser(id: string) {
      setUserId(id);
      const remote = await loadProfilePreferences(id);
      if (remote) {
        setPreferences(remote);
        savePreferences(remote);
        return;
      }
      void saveProfilePreferences(id, loadPreferences());
    }

    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) void syncForUser(user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) void syncForUser(session.user.id);
      else setUserId(null);
    });

    return () => subscription.unsubscribe();
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
      if (userId) {
        void saveProfilePreferences(userId, next);
      }
      return next;
    });
  }, [pathname, userId]);

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
