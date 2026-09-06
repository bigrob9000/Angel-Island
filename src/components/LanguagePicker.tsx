"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { setLocaleCookie } from "@/i18n/client";
import { localeLabels, locales, type AppLocale } from "@/i18n/routing";

type Props = {
  onSaved?: () => void;
};

export function LanguagePicker({ onSaved }: Props) {
  const t = useTranslations("settings");
  const currentLocale = useLocale() as AppLocale;
  const router = useRouter();
  const [value, setValue] = useState<string>("auto");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const match = document.cookie.match(/(?:^|; )NEXT_LOCALE=([^;]*)/);
    setValue(match?.[1] ?? "auto");
  }, [currentLocale]);

  function handleChange(next: string) {
    setValue(next);
    setSaved(false);
    if (next === "auto") {
      setLocaleCookie("auto");
    } else {
      setLocaleCookie(next as AppLocale);
    }
    router.refresh();
    setSaved(true);
    onSaved?.();
  }

  return (
    <div className="space-y-3">
      <label htmlFor="language-select" className="block text-sm font-medium text-foreground">
        {t("languageTitle")}
      </label>
      <select
        id="language-select"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className="block w-full rounded-md border border-foreground/20 bg-white px-3 py-2 text-sm text-foreground focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
      >
        <option value="auto">{t("languageAuto")}</option>
        {locales.map((locale) => (
          <option key={locale} value={locale}>
            {localeLabels[locale]}
          </option>
        ))}
      </select>
      <p className="text-xs text-muted">{t("languageAutoHint")}</p>
      {saved && (
        <p className="text-sm text-accent" role="status">
          {t("languageSaved")}
        </p>
      )}
    </div>
  );
}
