import { defineRouting } from "next-intl/routing";

/** Locales we ship full UI translations for. Others fall back to English via locale matching. */
export const locales = [
  "en",
  "es",
  "fr",
  "de",
  "pt",
  "ja",
  "zh",
  "ko",
  "it",
  "nl",
  "pl",
  "ru",
  "ar",
  "hi",
  "tr",
] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "en";

export const routing = defineRouting({
  locales: [...locales],
  defaultLocale,
  localePrefix: "never",
  localeDetection: true,
});

/** Native language names for the settings picker. */
export const localeLabels: Record<AppLocale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  pt: "Português",
  ja: "日本語",
  zh: "中文",
  ko: "한국어",
  it: "Italiano",
  nl: "Nederlands",
  pl: "Polski",
  ru: "Русский",
  ar: "العربية",
  hi: "हिन्दी",
  tr: "Türkçe",
};
