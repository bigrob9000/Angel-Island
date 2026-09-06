"use client";

import { useTranslations } from "next-intl";
import { NotFoundPanel } from "@/components/NotFoundPanel";

export default function AppNotFound() {
  const t = useTranslations("errors");
  const tc = useTranslations("common");

  return (
    <NotFoundPanel
      title={t("notFoundTitle")}
      description="That link doesn't match anything here. It may have moved or been removed."
      backHref="/home"
      backLabel={tc("backHome")}
    />
  );
}
