"use client";

import { useTranslations } from "next-intl";
import { INTRODUCTIONS_PINNED } from "@/lib/introductions";

export function IntroductionsPinned() {
  const t = useTranslations("rooms");

  return (
    <aside className="surface p-5 space-y-4 ring-1 ring-accent/15">
      <p className="text-sm font-medium text-foreground">{t("introductionsPinned")}</p>
      <p className="text-sm text-muted leading-relaxed">{INTRODUCTIONS_PINNED.welcome}</p>
      <p className="text-sm text-muted leading-relaxed">{INTRODUCTIONS_PINNED.lead}</p>
      <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted leading-relaxed">
        {INTRODUCTIONS_PINNED.bullets.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div className="space-y-2 pt-1">
        <p className="text-sm font-medium text-foreground">{t("introductionsComments")}</p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted leading-relaxed">
          {INTRODUCTIONS_PINNED.commentBullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <p className="text-sm text-muted leading-relaxed italic">{INTRODUCTIONS_PINNED.closing}</p>
    </aside>
  );
}
