"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getPwaEnvironment,
  IPHONE_PWA_HINT_DISMISS_KEY,
  needsIphoneHomeScreenHint,
} from "@/lib/pwa";

type Props = {
  /** When false, always show on Settings even if dismissed on Home. */
  respectDismiss?: boolean;
};

export function IphonePwaHint({ respectDismiss = true }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!needsIphoneHomeScreenHint()) {
      setVisible(false);
      return;
    }
    if (respectDismiss && window.localStorage.getItem(IPHONE_PWA_HINT_DISMISS_KEY) === "1") {
      setVisible(false);
      return;
    }
    setVisible(true);
  }, [respectDismiss]);

  if (!visible) return null;

  const env = getPwaEnvironment();

  function dismiss() {
    window.localStorage.setItem(IPHONE_PWA_HINT_DISMISS_KEY, "1");
    setVisible(false);
  }

  return (
    <section className="rounded-lg border border-foreground/10 bg-white/60 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-medium text-foreground">Add Angel Island to your Home Screen</h2>
          <p className="mt-1 text-sm text-muted">
            On {env.platform === "ios" ? "iPhone and iPad" : "this device"}, Safari tabs can&apos;t
            receive browser notifications. Install the app to your home screen first — then you can
            turn on alerts in Settings.
          </p>
        </div>
        {respectDismiss && (
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 text-sm text-muted hover:text-foreground"
          >
            Dismiss
          </button>
        )}
      </div>

      <ol className="mt-4 space-y-3 text-sm text-foreground">
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs font-medium">
            1
          </span>
          <span>
            In Safari, tap the <strong>Share</strong> button (square with an arrow pointing up).
          </span>
        </li>
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs font-medium">
            2
          </span>
          <span>
            Scroll down and tap <strong>Add to Home Screen</strong>.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs font-medium">
            3
          </span>
          <span>
            Open Angel Island from the new icon on your home screen — not from a Safari tab.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs font-medium">
            4
          </span>
          <span>
            Then go to{" "}
            <Link href="/settings" className="underline underline-offset-2 hover:no-underline">
              Settings
            </Link>{" "}
            → Browser notifications and turn them on.
          </span>
        </li>
      </ol>

      <p className="mt-4 text-xs text-muted">
        Requires iOS 16.4 or later. Email notifications still work without this step.
      </p>
    </section>
  );
}
