export type UserPreferences = {
  calmMode: boolean;
  reduceMotion: boolean;
  easierReadingFont: boolean;
};

export const PREFERENCES_KEY = "angel_island_preferences";

export const DEFAULT_PREFERENCES: UserPreferences = {
  calmMode: false,
  reduceMotion: false,
  easierReadingFont: false,
};

export function loadPreferences(): UserPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;

  try {
    const raw = window.localStorage.getItem(PREFERENCES_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return {
      calmMode: Boolean(parsed.calmMode),
      reduceMotion: Boolean(parsed.reduceMotion),
      easierReadingFont: Boolean(parsed.easierReadingFont),
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(prefs: UserPreferences): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
}

export function shouldReduceMotion(prefs: UserPreferences): boolean {
  if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return true;
  }
  return prefs.calmMode || prefs.reduceMotion;
}
