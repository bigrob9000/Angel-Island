"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useInbox } from "@/components/InboxProvider";
import { usePreferences } from "@/components/PreferencesProvider";
import { shouldReduceMotion } from "@/lib/preferences";

const AUTO_DISMISS_MS = 10000;

export function InboxMessageNotice() {
  const { messageNotice, dismissMessageNotice } = useInbox();
  const { preferences } = usePreferences();
  const motionReduced = shouldReduceMotion(preferences);

  useEffect(() => {
    if (!messageNotice) return;
    const timer = window.setTimeout(dismissMessageNotice, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [messageNotice, dismissMessageNotice]);

  if (!messageNotice) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-6 sm:pb-8"
      role="region"
      aria-live="polite"
      aria-label="New message"
    >
      <div
        className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-lg border border-foreground/15 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm ${
          motionReduced ? "" : "animate-inbox-notice"
        }`}
      >
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            New message from {messageNotice.senderName}
          </p>
          <p className="mt-0.5 truncate text-sm text-muted">{messageNotice.preview}</p>
          <Link
            href={`/messages/${messageNotice.inviteId}`}
            onClick={dismissMessageNotice}
            className="mt-2 inline-block text-sm font-medium text-accent hover:underline"
          >
            Open conversation
          </Link>
        </div>
        <button
          type="button"
          onClick={dismissMessageNotice}
          className="shrink-0 text-sm text-muted hover:text-foreground"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
