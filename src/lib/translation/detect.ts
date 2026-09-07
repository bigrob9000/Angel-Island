import { franc } from "franc-min";
import type { AppLocale } from "@/i18n/routing";
import { appLocaleFromFranc, MIN_TRANSLATE_LENGTH } from "@/lib/translation/config";

export function detectTextLocale(text: string): AppLocale | null {
  const trimmed = text.trim();
  if (trimmed.length < MIN_TRANSLATE_LENGTH) return null;
  return appLocaleFromFranc(franc(trimmed, { minLength: MIN_TRANSLATE_LENGTH }));
}

export function shouldOfferTranslation(text: string, viewerLocale: AppLocale): boolean {
  const trimmed = text.trim();
  if (trimmed.length < MIN_TRANSLATE_LENGTH) return false;

  const detected = detectTextLocale(trimmed);
  if (!detected) {
    // Unknown language — offer translation unless viewer reads English and text looks ASCII-only.
    if (viewerLocale === "en" && /^[\x00-\x7F\s\d\p{P}]+$/u.test(trimmed)) {
      return false;
    }
    return true;
  }

  return detected !== viewerLocale;
}
