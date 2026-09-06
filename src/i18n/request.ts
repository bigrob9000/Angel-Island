import { match } from "@formatjs/intl-localematcher";
import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE } from "./constants";
import { defaultLocale, locales, type AppLocale } from "./routing";

function isAppLocale(value: string): value is AppLocale {
  return (locales as readonly string[]).includes(value);
}

function deepMerge(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...base };
  for (const key of Object.keys(override)) {
    const baseVal = base[key];
    const overrideVal = override[key];
    if (
      overrideVal &&
      typeof overrideVal === "object" &&
      !Array.isArray(overrideVal) &&
      baseVal &&
      typeof baseVal === "object" &&
      !Array.isArray(baseVal)
    ) {
      result[key] = deepMerge(
        baseVal as Record<string, unknown>,
        overrideVal as Record<string, unknown>,
      );
    } else {
      result[key] = overrideVal;
    }
  }
  return result;
}

async function resolveLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  if (cookieLocale && isAppLocale(cookieLocale)) {
    return cookieLocale;
  }

  const headerStore = await headers();
  const acceptLanguage = headerStore.get("accept-language");
  if (acceptLanguage) {
    const requested = acceptLanguage
      .split(",")
      .map((part) => part.split(";")[0]?.trim())
      .filter(Boolean) as string[];
    const matched = match(requested, [...locales], defaultLocale);
    if (isAppLocale(matched)) {
      return matched;
    }
  }

  return defaultLocale;
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  const enMessages = (await import("../../messages/en.json")).default;

  if (locale === defaultLocale) {
    return { locale, messages: enMessages };
  }

  const localeMessages = (await import(`../../messages/${locale}.json`)).default;
  const messages = deepMerge(
    enMessages as Record<string, unknown>,
    localeMessages as Record<string, unknown>,
  );

  return { locale, messages };
});
