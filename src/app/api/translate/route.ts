import { NextResponse } from "next/server";
import { isAdminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { AppLocale } from "@/i18n/routing";
import { locales } from "@/i18n/routing";
import {
  deeplTargetForLocale,
  isTranslationConfigured,
} from "@/lib/translation/config";
import { detectTextLocale } from "@/lib/translation/detect";
import {
  translateWithDeepL,
  TranslationNotConfiguredError,
  TranslationUnsupportedLocaleError,
} from "@/lib/translation/deepl";
import { hashContent } from "@/lib/translation/hash";
import { MAX_TRANSLATE_LENGTH } from "@/lib/translation/config";

function isAppLocale(value: string): value is AppLocale {
  return (locales as readonly string[]).includes(value);
}

export async function GET() {
  return NextResponse.json({
    available: isTranslationConfigured() && isAdminConfigured(),
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  if (!isTranslationConfigured()) {
    return NextResponse.json(
      { error: "Translation is not configured.", code: "TRANSLATION_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "Translation cache is not configured.", code: "TRANSLATION_CACHE_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  let body: { text?: string; targetLocale?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const text = body.text?.trim() ?? "";
  const targetLocale = body.targetLocale?.trim() ?? "";

  if (!text) {
    return NextResponse.json({ error: "Nothing to translate." }, { status: 400 });
  }

  if (text.length > MAX_TRANSLATE_LENGTH) {
    return NextResponse.json({ error: "Text is too long to translate." }, { status: 400 });
  }

  if (!isAppLocale(targetLocale)) {
    return NextResponse.json({ error: "Unsupported target language." }, { status: 400 });
  }

  if (!deeplTargetForLocale(targetLocale)) {
    return NextResponse.json(
      { error: "Translation to this language is not supported yet.", code: "UNSUPPORTED_LOCALE" },
      { status: 400 },
    );
  }

  const detectedSource = detectTextLocale(text);
  if (detectedSource && detectedSource === targetLocale) {
    return NextResponse.json({
      translatedText: text,
      sourceLocale: detectedSource,
      targetLocale,
      sameLanguage: true,
    });
  }

  const contentHash = await hashContent(text);
  const admin = createAdminClient();

  const { data: cached } = await admin
    .from("content_translations")
    .select("translated_text, source_locale")
    .eq("content_hash", contentHash)
    .eq("target_locale", targetLocale)
    .maybeSingle();

  if (cached?.translated_text) {
    return NextResponse.json({
      translatedText: cached.translated_text,
      sourceLocale: cached.source_locale,
      targetLocale,
      cached: true,
    });
  }

  try {
    const result = await translateWithDeepL(text, targetLocale, detectedSource);

    if (result.translatedText === text) {
      return NextResponse.json({
        translatedText: text,
        sourceLocale: result.detectedSourceLocale ?? detectedSource,
        targetLocale,
        sameLanguage: true,
      });
    }

    await admin.from("content_translations").upsert(
      {
        content_hash: contentHash,
        target_locale: targetLocale,
        source_locale: result.detectedSourceLocale ?? detectedSource,
        translated_text: result.translatedText,
      },
      { onConflict: "content_hash,target_locale" },
    );

    return NextResponse.json({
      translatedText: result.translatedText,
      sourceLocale: result.detectedSourceLocale ?? detectedSource,
      targetLocale,
      cached: false,
    });
  } catch (error) {
    if (error instanceof TranslationNotConfiguredError) {
      return NextResponse.json(
        { error: "Translation is not configured.", code: "TRANSLATION_NOT_CONFIGURED" },
        { status: 503 },
      );
    }
    if (error instanceof TranslationUnsupportedLocaleError) {
      return NextResponse.json({ error: error.message, code: "UNSUPPORTED_LOCALE" }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Translation failed." },
      { status: 502 },
    );
  }
}
