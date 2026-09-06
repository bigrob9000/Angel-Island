"use client";

import { useTranslations } from "next-intl";
import { translateProfileOption } from "@/lib/i18n/labels";

type Props = {
  items: string[];
};

/** Profile chips stored in English — translate known option values at display time. */
export function ProfileChipList({ items }: Props) {
  const t = useTranslations("profileOptions");

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="chip">
          {translateProfileOption(item, t)}
        </span>
      ))}
    </div>
  );
}
