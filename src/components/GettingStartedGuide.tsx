"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const DISMISS_KEY = "angel_island_getting_started_dismissed";

type Props = {
  show: boolean;
};

export function GettingStartedGuide({ show }: Props) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (!show || dismissed) {
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
          <h2 className="font-medium text-foreground">Getting started</h2>
          <p className="mt-1 text-sm text-muted">
            Three gentle ways in — pick one, or just look around.
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
      <ol className="mt-4 space-y-3 text-sm">
        <li className="flex gap-3">
          <span className="font-medium text-muted">1</span>
          <span>
            <Link href="/profile/edit?step=0" className="text-foreground underline hover:no-underline">
              Finish your profile
            </Link>
            <span className="text-muted"> — so people know who you are.</span>
          </span>
        </li>
        <li className="flex gap-3">
          <span className="font-medium text-muted">2</span>
          <span>
            <Link href="/rooms" className="text-foreground underline hover:no-underline">
              Visit a room
            </Link>
            <span className="text-muted"> — read, listen, or share when you&apos;re ready.</span>
          </span>
        </li>
        <li className="flex gap-3">
          <span className="font-medium text-muted">3</span>
          <span>
            <Link href="/explore" className="text-foreground underline hover:no-underline">
              Explore people
            </Link>
            <span className="text-muted"> — invite someone to chat if it feels right.</span>
          </span>
        </li>
      </ol>
    </section>
  );
}
