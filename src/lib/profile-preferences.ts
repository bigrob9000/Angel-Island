import { isAppTheme, DEFAULT_APP_THEME } from "@/lib/app-theme";
import type { UserPreferences } from "@/lib/preferences";
import { createClient } from "@/lib/supabase";

type ProfilePrefsRow = {
  app_theme: string | null;
  calm_mode: boolean | null;
  reduce_motion: boolean | null;
  easier_reading_font: boolean | null;
};

export function profileRowToPreferences(row: ProfilePrefsRow | null): UserPreferences | null {
  if (!row) return null;
  return {
    calmMode: Boolean(row.calm_mode),
    reduceMotion: Boolean(row.reduce_motion),
    easierReadingFont: Boolean(row.easier_reading_font),
    appTheme: isAppTheme(row.app_theme) ? row.app_theme : DEFAULT_APP_THEME,
  };
}

export function preferencesToProfileRow(prefs: UserPreferences) {
  return {
    app_theme: prefs.appTheme,
    calm_mode: prefs.calmMode,
    reduce_motion: prefs.reduceMotion,
    easier_reading_font: prefs.easierReadingFont,
  };
}

export async function loadProfilePreferences(userId: string): Promise<UserPreferences | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("app_theme, calm_mode, reduce_motion, easier_reading_font")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return profileRowToPreferences(data as ProfilePrefsRow);
}

export async function saveProfilePreferences(userId: string, prefs: UserPreferences): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update(preferencesToProfileRow(prefs))
    .eq("id", userId);

  return !error;
}

