"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import {
  collaborationsSetupError,
  loadCollaborationPreviews,
  type CollaborationPreview,
} from "@/lib/collaborations";
import { EmptyState } from "@/components/EmptyState";
import { CollaborationPreviewLink } from "@/components/CollaborationPreviewLink";
import { useCollab } from "@/components/CollabProvider";

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
  const [refreshKey, setRefreshKey] = useState(0);
  const { collaborations: trackedCollabs, refresh: refreshCollabInbox } = useCollab();

  const unreadById = useMemo(() => {
    const map: Record<string, boolean> = {};
    trackedCollabs.forEach((collab) => {
      if (collab.unread) map[collab.id] = true;
    });
    return map;
  }, [trackedCollabs]);

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
  }, [filter, refreshKey]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-lead">Collaborations</h1>
        <p className="section-copy">
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
            className={`nav-pill text-sm ${
              filter === id
                ? "nav-pill-active text-foreground"
                : "text-muted hover:text-foreground"
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
            <Link href="/messages" className="btn-secondary">
              Check Messages
            </Link>
            <Link href="/explore" className="btn-secondary">
              Explore people
            </Link>
          </EmptyState>
        ) : (
          <EmptyState title="Nothing here right now." />
        )
      ) : (
        <ul className="space-y-3">
          {previews.map((preview) => (
            <li key={preview.id}>
              <CollaborationPreviewLink
                preview={preview}
                showActions={filter !== "past"}
                unread={Boolean(unreadById[preview.id])}
                onUpdated={() => {
                  setRefreshKey((key) => key + 1);
                  void refreshCollabInbox();
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
