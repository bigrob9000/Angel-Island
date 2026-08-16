"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ProfileCompletenessProfile } from "@/lib/profile-completeness";
import { getOptionalProfileCompleteness } from "@/lib/profile-completeness";

const DISMISS_KEY = "angel_island_profile_nudge_dismissed";

type Props = {
  profile: ProfileCompletenessProfile;
  /** Show required basics reminder when name/username missing. */
  showBasicsWarning?: boolean;
};

export function ProfileCompletenessNudge({ profile, showBasicsWarning = true }: Props) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  const optional = getOptionalProfileCompleteness(profile);
  const nextItems = optional.items.filter((item) => !item.done).slice(0, 3);
  const missingBasics =
    showBasicsWarning && (!profile.first_name?.trim() || !profile.username?.trim());

  const showNudge = missingBasics || (!dismissed && !optional.isComplete && nextItems.length > 0);

  if (!showNudge) return null;

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  if (missingBasics) {
    return (
      <section className="rounded-lg border border-foreground/10 bg-white/60 p-5">
        <h2 className="font-medium text-foreground">Finish the basics</h2>
        <p className="mt-1 text-sm text-muted">
          Add your first name and username so others can find you in Explore and rooms.
        </p>
        <Link
          href="/profile/edit?step=0"
          className="mt-3 inline-block text-sm text-foreground underline underline-offset-2 hover:no-underline"
        >
          Complete basics
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-foreground/10 bg-white/60 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-medium text-foreground">Your profile</h2>
          <p className="mt-1 text-sm text-muted">
            Optional details help people find you — only what feels comfortable.
          </p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
            <div
              className="h-full rounded-full bg-foreground/50 transition-all"
              style={{ width: `${optional.percent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            {optional.completeCount} of {optional.items.length} optional steps · {optional.percent}%
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 text-sm text-muted hover:text-foreground"
        >
          Dismiss
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
        Edit full profile →
      </Link>
    </section>
  );
}
