"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useCollab } from "@/components/CollabProvider";
import { usePreferences } from "@/components/PreferencesProvider";
import { shouldReduceMotion } from "@/lib/preferences";

const AUTO_DISMISS_MS = 10000;

export function InboxCollabNotice() {
  const { collabNotice, dismissCollabNotice } = useCollab();
  const { preferences } = usePreferences();
  const motionReduced = shouldReduceMotion(preferences);

  useEffect(() => {
    if (!collabNotice) return;
    const timer = window.setTimeout(dismissCollabNotice, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [collabNotice, dismissCollabNotice]);

  if (!collabNotice) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-24 sm:pb-28"
      role="region"
      aria-live="polite"
      aria-label="Collaboration update"
    >
      <div
        className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-lg border border-foreground/15 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm ${
          motionReduced ? "" : "animate-inbox-notice"
        }`}
      >
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            {collabNotice.authorName} {collabNotice.activityLabel}
          </p>
          <p className="mt-0.5 truncate text-sm text-muted">{collabNotice.preview}</p>
          <Link
            href={`/collaborations/${collabNotice.collaborationId}`}
            onClick={dismissCollabNotice}
            className="mt-2 inline-block text-sm font-medium text-accent hover:underline"
          >
            Open collaboration
          </Link>
        </div>
        <button
          type="button"
          onClick={dismissCollabNotice}
          className="shrink-0 text-sm text-muted hover:text-foreground"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
