"use client";

import { LOCALE_COOKIE } from "./constants";
import { defaultLocale, type AppLocale } from "./routing";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/** Persist locale choice in the cookie next-intl reads (empty = auto-detect). */
export function setLocaleCookie(locale: AppLocale | "auto"): void {
  if (typeof document === "undefined") return;

  if (locale === "auto") {
    document.cookie = `${LOCALE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    return;
  }

  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function readLocaleCookie(): AppLocale | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  const value = match?.[1];
  if (!value) return null;
  return value as AppLocale;
}

export function detectBrowserLocale(): AppLocale {
  if (typeof navigator === "undefined") return defaultLocale;
  const lang = navigator.language?.split("-")[0]?.toLowerCase();
  if (!lang) return defaultLocale;
  return lang as AppLocale;
}
