"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { AppLocale } from "@/i18n/routing";
import { shouldOfferTranslation } from "@/lib/translation/detect";
import { deeplTargetForLocale } from "@/lib/translation/config";

type Props = {
  text: string;
  className?: string;
  /** Use for titles vs body copy */
  as?: "p" | "span";
};

export function TranslatableText({ text, className = "", as = "p" }: Props) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("translation");
  const [serviceAvailable, setServiceAvailable] = useState<boolean | null>(null);
  const [canOffer, setCanOffer] = useState(false);
  const [mode, setMode] = useState<"original" | "translated">("original");
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/translate")
      .then((res) => res.json())
      .then((payload: { available?: boolean }) => {
        if (!cancelled) setServiceAvailable(Boolean(payload.available));
      })
      .catch(() => {
        if (!cancelled) setServiceAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setCanOffer(
      shouldOfferTranslation(text, locale) && Boolean(deeplTargetForLocale(locale)),
    );
    setMode("original");
    setTranslatedText(null);
    setError(null);
  }, [text, locale]);

  const showButton = serviceAvailable && canOffer;
  const display = mode === "translated" && translatedText ? translatedText : text;
  const Tag = as;

  async function toggleTranslation() {
    if (mode === "translated") {
      setMode("original");
      setError(null);
      return;
    }

    if (translatedText) {
      setMode("translated");
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLocale: locale }),
      });

      const payload = (await response.json()) as {
        translatedText?: string;
        sameLanguage?: boolean;
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? t("failed"));
        return;
      }

      if (payload.sameLanguage || !payload.translatedText) {
        setCanOffer(false);
        return;
      }

      setTranslatedText(payload.translatedText);
      setMode("translated");
    } catch {
      setError(t("failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Tag className={className}>{display}</Tag>
      {showButton && (
        <div className="mt-1">
          <button
            type="button"
            onClick={toggleTranslation}
            disabled={loading}
            className="text-xs text-muted hover:text-foreground underline underline-offset-2 disabled:opacity-50"
          >
            {loading
              ? t("translating")
              : mode === "translated"
                ? t("showOriginal")
                : t("seeTranslation")}
          </button>
        </div>
      )}
      {error && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
