"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Profile } from "@/lib/types";
import { getProfileCompleteness } from "@/lib/profile-completeness";

const DISMISS_KEY = "angel_island_profile_nudge_dismissed";

type Props = {
  profile: Pick<Profile, "avatar_url" | "about" | "genres_make" | "roles">;
};

export function ProfileCompletenessNudge({ profile }: Props) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  const { items, completeCount, isComplete } = getProfileCompleteness(profile);
  const nextItems = items.filter((item) => !item.done).slice(0, 2);

  if (dismissed || isComplete || nextItems.length === 0) {
    return null;
  }

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <section className="rounded-lg border border-foreground/10 bg-white/60 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-medium text-foreground">Your profile</h2>
          <p className="mt-1 text-sm text-muted">
            A few details help people find you — only what feels comfortable.
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
      <p className="mt-3 text-xs text-muted">
        {completeCount} of {items.length} optional steps done
      </p>
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
    </section>
  );
}
