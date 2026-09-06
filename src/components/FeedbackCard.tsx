"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase";
import { FEEDBACK_EMAIL } from "@/lib/site";
import { getFeedbackMailtoUrl } from "@/lib/feedback";

export function FeedbackCard() {
  const t = useTranslations("settings");
  const [href, setHref] = useState(() => getFeedbackMailtoUrl());

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();
      setHref(getFeedbackMailtoUrl({ username: profile?.username ?? null }));
    });
  }, []);

  return (
    <section className="surface p-5 space-y-3">
      <div>
        <h2 className="font-medium text-foreground">{t("feedbackTitle")}</h2>
        <p className="mt-1 text-sm text-muted">{t("feedbackCopy")}</p>
      </div>
      <a
        href={href}
        className="inline-flex rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5 transition-colors"
      >
        {t("sendFeedback")}
      </a>
      <p className="text-xs text-muted">{t("feedbackHint", { email: FEEDBACK_EMAIL })}</p>
    </section>
  );
}
