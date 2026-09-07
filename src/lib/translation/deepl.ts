import { APP_TO_DEEPL, isTranslationConfigured } from "@/lib/translation/config";
import type { AppLocale } from "@/i18n/routing";

export class TranslationNotConfiguredError extends Error {
  constructor() {
    super("Translation is not configured.");
    this.name = "TranslationNotConfiguredError";
  }
}

export class TranslationUnsupportedLocaleError extends Error {
  constructor(locale: AppLocale) {
    super(`Translation to ${locale} is not supported yet.`);
    this.name = "TranslationUnsupportedLocaleError";
  }
}

function deeplBaseUrl(authKey: string): string {
  return authKey.endsWith(":fx")
    ? "https://api-free.deepl.com"
    : "https://api.api.deepl.com";
}

export async function translateWithDeepL(
  text: string,
  targetLocale: AppLocale,
  sourceLocale?: AppLocale | null,
): Promise<{ translatedText: string; detectedSourceLocale: AppLocale | null }> {
  const authKey = process.env.DEEPL_AUTH_KEY?.trim();
  if (!isTranslationConfigured() || !authKey) {
    throw new TranslationNotConfiguredError();
  }

  const targetLang = APP_TO_DEEPL[targetLocale];
  if (!targetLang) {
    throw new TranslationUnsupportedLocaleError(targetLocale);
  }

  const params = new URLSearchParams();
  params.set("text", text);
  params.set("target_lang", targetLang);

  const sourceLang = sourceLocale ? APP_TO_DEEPL[sourceLocale] : null;
  if (sourceLang) {
    params.set("source_lang", sourceLang);
  }

  const response = await fetch(`${deeplBaseUrl(authKey)}/v2/translate`, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${authKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `DeepL error (${response.status})`);
  }

  const payload = (await response.json()) as {
    translations?: Array<{ text: string; detected_source_language?: string }>;
  };

  const translatedText = payload.translations?.[0]?.text?.trim();
  if (!translatedText) {
    throw new Error("Empty translation response.");
  }

  const detectedCode = payload.translations?.[0]?.detected_source_language?.toLowerCase();
  const detectedSourceLocale =
    detectedCode === "en" ? "en"
    : detectedCode === "es" ? "es"
    : detectedCode === "fr" ? "fr"
    : detectedCode === "de" ? "de"
    : detectedCode === "pt" ? "pt"
    : detectedCode === "ja" ? "ja"
    : detectedCode === "zh" ? "zh"
    : detectedCode === "ko" ? "ko"
    : detectedCode === "it" ? "it"
    : detectedCode === "nl" ? "nl"
    : detectedCode === "pl" ? "pl"
    : detectedCode === "ru" ? "ru"
    : detectedCode === "ar" ? "ar"
    : detectedCode === "tr" ? "tr"
    : sourceLocale ?? null;

  return { translatedText, detectedSourceLocale };
}
