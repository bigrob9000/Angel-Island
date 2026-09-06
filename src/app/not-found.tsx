"use client";

import { useTranslations } from "next-intl";
import { NotFoundPanel } from "@/components/NotFoundPanel";

export default function RootNotFound() {
  const t = useTranslations("errors");

  return (
    <NotFoundPanel
      title={t("notFoundTitle")}
      description="That link doesn't match anything here. It may have moved or been removed."
      backHref="/"
      backLabel="← Angel Island"
    />
  );
}
