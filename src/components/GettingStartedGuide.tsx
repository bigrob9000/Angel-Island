"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { ProfileCompletenessProfile } from "@/lib/profile-completeness";
import { getOptionalProfileCompleteness } from "@/lib/profile-completeness";
import { useDismissStorage } from "@/hooks/useDismissStorage";

const DISMISS_KEY = "angel_island_getting_started_dismissed";

type Props = {
  show: boolean;
  profile: ProfileCompletenessProfile | null;
  hasRooms: boolean;
  hasConnected: boolean;
  hasCollabs: boolean;
};

type Step = {
  id: string;
  done: boolean;
  label: ReactNode;
};

export function GettingStartedGuide({
  show,
  profile,
  hasRooms,
  hasConnected,
  hasCollabs,
}: Props) {
  const { dismissed, ready, dismiss } = useDismissStorage(DISMISS_KEY);

  if (!ready || !show || dismissed || !profile) {
    return null;
  }

  const optional = getOptionalProfileCompleteness(profile);
  const profileDone = optional.isComplete;
  const nextProfileItem = optional.items.find((item) => !item.done);

  const steps: Step[] = [
    {
      id: "profile",
      done: profileDone,
      label: profileDone ? (
        <span className="text-muted line-through">Profile ready for Explore</span>
      ) : nextProfileItem ? (
        <>
          <Link
            href={nextProfileItem.href}
            className="text-foreground underline hover:no-underline"
          >
            {nextProfileItem.label}
          </Link>
          <span className="text-muted">
            {" "}
            — {optional.completeCount} of {optional.items.length} optional details done.
          </span>
        </>
      ) : (
        <>
          <Link href="/profile/edit" className="text-foreground underline hover:no-underline">
            Finish your profile
          </Link>
          <span className="text-muted"> — so people know who you are.</span>
        </>
      ),
    },
    {
      id: "room",
      done: hasRooms,
      label: hasRooms ? (
        <span className="text-muted line-through">You&apos;ve joined a room</span>
      ) : (
        <>
          <Link href="/rooms" className="text-foreground underline hover:no-underline">
            Visit a room
          </Link>
          <span className="text-muted"> — read, listen, or share when you&apos;re ready.</span>
        </>
      ),
    },
    {
      id: "explore",
      done: hasConnected,
      label: hasConnected ? (
        <span className="text-muted line-through">You&apos;ve started a conversation</span>
      ) : (
        <>
          <Link href="/explore" className="text-foreground underline hover:no-underline">
            Explore people
          </Link>
          <span className="text-muted"> — invite someone to chat when it feels right.</span>
        </>
      ),
    },
    {
      id: "collab",
      done: hasCollabs,
      label: hasCollabs ? (
        <span className="text-muted line-through">You have a collab space open</span>
      ) : (
        <>
          <Link href="/explore" className="text-foreground underline hover:no-underline">
            Invite someone to collaborate
          </Link>
          <span className="text-muted">
            {" "}
            — from their profile. When they&apos;re interested, a shared workspace opens under{" "}
            <Link href="/collaborations" className="text-foreground underline hover:no-underline">
              Collabs
            </Link>
            .
          </span>
        </>
      ),
    },
  ];

  const doneCount = steps.filter((step) => step.done).length;

  return (
    <section className="surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="section-heading">Getting started</h2>
          <p className="mt-1 text-sm text-muted">
            {doneCount === 0
              ? "You finished onboarding — here are four gentle next steps."
              : `${doneCount} of ${steps.length} done — pick up wherever you left off.`}
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
        {steps.map((step, index) => (
          <li key={step.id} className="flex gap-3">
            <span
              className={`font-medium ${step.done ? "text-foreground/40" : "text-muted"}`}
              aria-hidden
            >
              {step.done ? "✓" : index + 1}
            </span>
            <span>{step.label}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
