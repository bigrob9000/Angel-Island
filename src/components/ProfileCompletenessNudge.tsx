"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ProfileCompletenessProfile } from "@/lib/profile-completeness";
import { getOptionalProfileCompleteness } from "@/lib/profile-completeness";
import { useDismissStorage } from "@/hooks/useDismissStorage";

const DISMISS_KEY = "angel_island_profile_nudge_dismissed";

type Props = {
  profile: ProfileCompletenessProfile;
  /** Show required basics reminder when name/username missing. */
  showBasicsWarning?: boolean;
};

export function ProfileCompletenessNudge({ profile, showBasicsWarning = true }: Props) {
  const t = useTranslations("profile");
  const { dismissed, ready, dismiss } = useDismissStorage(DISMISS_KEY);

  const optional = getOptionalProfileCompleteness(profile);
  const nextItems = optional.items.filter((item) => !item.done).slice(0, 3);
  const missingBasics =
    showBasicsWarning && (!profile.first_name?.trim() || !profile.username?.trim());

  const showNudge = missingBasics || (!dismissed && !optional.isComplete && nextItems.length > 0);

  if (!ready || !showNudge) return null;

  if (missingBasics) {
    return (
      <section className="surface p-5">
        <h2 className="section-heading">{t("nudgeBasics")}</h2>
        <p className="mt-1 text-sm text-muted">{t("nudgeBasicsCopy")}</p>
        <Link
          href="/profile/edit?step=0"
          className="mt-3 inline-block text-sm text-foreground underline underline-offset-2 hover:no-underline"
        >
          {t("nudgeBasicsLink")}
        </Link>
      </section>
    );
  }

  const remaining = optional.items.length - optional.completeCount;

  return (
    <section className="surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="section-heading">{t("nudgeOptional")}</h2>
          <p className="mt-1 text-sm text-muted">
            {remaining === 1
              ? t("nudgeOptionalOneRemaining")
              : t("nudgeOptionalManyRemaining", { remaining })}
          </p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-accent/15">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${optional.percent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            {t("nudgeOptionalProgress", {
              complete: optional.completeCount,
              total: optional.items.length,
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 text-sm text-muted hover:text-foreground"
        >
          {t("nudgeDismiss")}
        </button>
      </div>
      <ul className="mt-3 space-y-2">
        {nextItems.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="text-sm text-foreground underline underline-offset-2 hover:no-underline"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href="/profile/edit"
        className="mt-4 inline-block text-sm text-muted hover:text-foreground"
      >
        {t("nudgeEditFullProfile")}
      </Link>
    </section>
  );
}
