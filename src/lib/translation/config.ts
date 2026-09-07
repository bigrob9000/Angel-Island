import type { AppLocale } from "@/i18n/routing";

/** Minimum characters before we offer translation (short text detects poorly). */
export const MIN_TRANSLATE_LENGTH = 24;

/** Maximum characters per translation request. */
export const MAX_TRANSLATE_LENGTH = 5000;

const FRANC_TO_APP: Record<string, AppLocale> = {
  eng: "en",
  spa: "es",
  fra: "fr",
  deu: "de",
  por: "pt",
  jpn: "ja",
  cmn: "zh",
  zho: "zh",
  kor: "ko",
  ita: "it",
  nld: "nl",
  pol: "pl",
  rus: "ru",
  arb: "ar",
  hin: "hi",
  tur: "tr",
};

/** Map app locale → DeepL API language code. */
export const APP_TO_DEEPL: Record<AppLocale, string | null> = {
  en: "EN",
  es: "ES",
  fr: "FR",
  de: "DE",
  pt: "PT-PT",
  ja: "JA",
  zh: "ZH",
  ko: "KO",
  it: "IT",
  nl: "NL",
  pl: "PL",
  ru: "RU",
  ar: "AR",
  hi: null,
  tr: "TR",
};

export function isTranslationConfigured(): boolean {
  return Boolean(process.env.DEEPL_AUTH_KEY?.trim());
}

export function appLocaleFromFranc(code: string | undefined): AppLocale | null {
  if (!code || code === "und") return null;
  return FRANC_TO_APP[code] ?? null;
}

export function deeplTargetForLocale(locale: AppLocale): string | null {
  return APP_TO_DEEPL[locale] ?? null;
}
