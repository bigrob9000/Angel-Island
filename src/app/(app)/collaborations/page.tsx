"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { ProfileAttribution } from "@/components/ProfileAttribution";
import {
  collaborationFocusLine,
  collaborationStatusLabel,
  collaborationToneLine,
  collaborationsSetupError,
  loadCollaborationPreviews,
  type CollaborationPreview,
} from "@/lib/collaborations";
import { EmptyState } from "@/components/EmptyState";

type Filter = "active" | "paused" | "past";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "active", label: "Active" },
  { id: "paused", label: "Paused" },
  { id: "past", label: "Past" },
];

export default function CollaborationsPage() {
  const [filter, setFilter] = useState<Filter>("active");
  const [previews, setPreviews] = useState<CollaborationPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);

  useEffect(() => {
    setLoading(true);
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setLoading(false);
        return;
      }
      const result = await loadCollaborationPreviews(user.id, filter);
      setPreviews(result.previews);
      setTableMissing(result.tableMissing);
      setLoading(false);
    });
  }, [filter]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-medium text-foreground">Collaborations</h1>
        <p className="mt-2 text-sm text-muted">
          Things you&apos;re exploring with other people — shared notes, links, and next steps. No
          deadlines, no pressure.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              filter === id
                ? "border-foreground/40 bg-foreground/10 text-foreground"
                : "border-foreground/15 bg-white/50 text-muted hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tableMissing && (
        <p className="text-sm text-muted">{collaborationsSetupError()}</p>
      )}

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : previews.length === 0 ? (
        filter === "active" ? (
          <EmptyState
            title="No active collaborations yet."
            description="When someone responds interested to a collab invite, a shared workspace opens here for notes, links, and next steps."
          >
            <Link
              href="/messages"
              className="rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
            >
              Check Messages
            </Link>
            <Link
              href="/explore"
              className="rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
            >
              Explore people
            </Link>
          </EmptyState>
        ) : (
          <EmptyState title="Nothing here right now." />
        )
      ) : (
        <ul className="space-y-3">
          {previews.map((preview) => {
            const tone = collaborationToneLine(preview.invite);
            return (
              <li key={preview.id}>
                <Link
                  href={`/collaborations/${preview.id}`}
                  className="block rounded-lg border border-foreground/10 bg-white/50 px-4 py-3 hover:bg-white/70"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <ProfileAttribution profile={preview.other} className="font-medium" />
                    <span className="text-xs text-muted">{collaborationStatusLabel(preview.status)}</span>
                  </div>
                  <p className="mt-2 text-sm text-foreground">{collaborationFocusLine(preview.invite)}</p>
                  {tone && <p className="mt-1 text-sm text-muted">{tone}</p>}
                  <p className="mt-2 text-xs text-muted">
                    Last activity{" "}
                    {new Date(preview.lastActivityAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
