"use client";

import { useTranslations } from "next-intl";
import { APP_THEMES, type AppTheme } from "@/lib/app-theme";

type Props = {
  value: AppTheme;
  onChange: (theme: AppTheme) => void;
};

export function AppThemePicker({ value, onChange }: Props) {
  const t = useTranslations("settings.appearance");

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {APP_THEMES.map((theme) => {
        const selected = value === theme;
        return (
          <button
            key={theme}
            type="button"
            onClick={() => onChange(theme)}
            aria-pressed={selected}
            className={`app-theme-preset app-theme-preview-${theme} ${
              selected ? "app-theme-preset-selected" : ""
            }`}
          >
            <span className="app-theme-preset-label">{t(`themes.${theme}`)}</span>
          </button>
        );
      })}
    </div>
  );
}
