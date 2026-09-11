"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase";
import {
  collaborationFocusLine,
  collaborationsSetupError,
  loadCollaborationPreviews,
  type CollaborationPreview,
} from "@/lib/collaborations";
import { restoreCollaborationToList } from "@/lib/collaboration-archive";
import { loadPendingGroupCollabInvitesForUser, loadPendingGroupMemberInvitesForUser } from "@/lib/group-collaborations";
import { EmptyState } from "@/components/EmptyState";
import { CollaborationPreviewLink } from "@/components/CollaborationPreviewLink";
import { GroupCollabInvitesSection } from "@/components/GroupCollabInvitesSection";
import { GroupMemberInvitesSection } from "@/components/GroupMemberInvitesSection";
import { NavCloudBackdrop } from "@/components/NavCloudBackdrop";
import { useCollab } from "@/components/CollabProvider";
import type { GroupCollabInviteWithMeta } from "@/lib/group-collaborations";

type Filter = "active" | "paused" | "past";

const FILTER_IDS = ["active", "paused", "past"] as const;

export default function CollaborationsPage() {
  const t = useTranslations("collaborations");
  const tc = useTranslations("common");
  const [filter, setFilter] = useState<Filter>("active");
  const [previews, setPreviews] = useState<CollaborationPreview[]>([]);
  const [groupReceived, setGroupReceived] = useState<GroupCollabInviteWithMeta[]>([]);
  const [groupSent, setGroupSent] = useState<GroupCollabInviteWithMeta[]>([]);
  const [groupInviteError, setGroupInviteError] = useState<string | null>(null);
  const [showSentSuccess, setShowSentSuccess] = useState(false);
  const [memberInvites, setMemberInvites] = useState<
    Awaited<ReturnType<typeof loadPendingGroupMemberInvitesForUser>>["invites"]
  >([]);
  const [archivedPreviews, setArchivedPreviews] = useState<CollaborationPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [actingId, setActingId] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const { collaborations: trackedCollabs, refresh: refreshCollabInbox } = useCollab();

  const unreadById = useMemo(() => {
    const map: Record<string, boolean> = {};
    trackedCollabs.forEach((collab) => {
      if (collab.unread) map[collab.id] = true;
    });
    return map;
  }, [trackedCollabs]);

  function selectFilter(next: Filter) {
    setFilter(next);
    if (next !== "active") {
      setGroupReceived([]);
      setGroupSent([]);
      setMemberInvites([]);
      setGroupInviteError(null);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("sent") === "1") {
      setShowSentSuccess(true);
      window.history.replaceState({}, "", "/collaborations");
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setLoading(false);
        return;
      }

      const previewResult = await loadCollaborationPreviews(user.id, filter);
      setPreviews(previewResult.previews);
      let missing = previewResult.tableMissing;

      if (filter === "past") {
        const archivedResult = await loadCollaborationPreviews(user.id, "past", {
          archivedOnly: true,
        });
        setArchivedPreviews(archivedResult.previews);
      } else {
        setArchivedPreviews([]);
      }

      if (filter === "active") {
        const [groupInvites, memberInviteResult] = await Promise.all([
          loadPendingGroupCollabInvitesForUser(user.id),
          loadPendingGroupMemberInvitesForUser(user.id),
        ]);
        setGroupReceived(groupInvites.received);
        setGroupSent(groupInvites.sent);
        setGroupInviteError(groupInvites.error ?? null);
        setMemberInvites(memberInviteResult.invites);
        missing =
          missing || groupInvites.tableMissing || memberInviteResult.tableMissing;
      }

      setTableMissing(missing);
      setLoading(false);
    });
  }, [filter, refreshKey]);

  async function restoreCollaboration(collaborationId: string) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setActingId(collaborationId);
    setRestoreError(null);
    const { error } = await restoreCollaborationToList(user.id, collaborationId);
    setActingId(null);

    if (error) {
      setRestoreError(error);
      return;
    }

    setArchivedPreviews((prev) => prev.filter((preview) => preview.id !== collaborationId));
    setRefreshKey((key) => key + 1);
    void refreshCollabInbox();
  }

  function refreshList() {
    setRefreshKey((key) => key + 1);
    void refreshCollabInbox();
  }

  function renderPreviewList(showClosedActions: boolean) {
    if (loading) {
      return <p className="text-muted">{tc("loading")}</p>;
    }

    if (previews.length === 0) {
      if (filter === "active") {
        return (
          <EmptyState
            title={t("emptyActive")}
            description={t("emptyActiveDescription")}
          >
            <Link href="/messages" className="btn-secondary">
              {t("checkMessages")}
            </Link>
            <Link href="/explore" className="btn-secondary">
              {t("explorePeople")}
            </Link>
          </EmptyState>
        );
      }

      return <EmptyState title={t("emptyOther")} />;
    }

    return (
      <ul className="space-y-3">
        {previews.map((preview) => (
          <li key={preview.id}>
            <CollaborationPreviewLink
              preview={preview}
              showActions={filter !== "past"}
              showClosedActions={showClosedActions}
              unread={Boolean(unreadById[preview.id])}
              onUpdated={refreshList}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-lead">{t("title")}</h1>
        <p className="section-copy">{t("subtitle")}</p>
      </div>

      <div className="space-y-3">
        <Link href="/collaborations/group/new" className="btn-primary collaborations-start-btn w-fit">
          {t("startGroup")}
        </Link>
        <div
          className="collaborations-filters flex flex-wrap gap-2 overflow-visible"
          role="tablist"
          aria-label={t("title")}
        >
          {FILTER_IDS.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={filter === id}
              onClick={() => selectFilter(id)}
              className={`nav-pill relative text-sm ${
                filter === id
                  ? "nav-pill-active text-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <span className="nav-pill-label">
                {filter === id && <NavCloudBackdrop />}
                <span className="relative z-[1]">
                  {id === "active" ? t("filterActive") : id === "paused" ? t("filterPaused") : t("filterPast")}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {showSentSuccess && (
        <p className="rounded-md border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-foreground" role="status">
          {t("groupSentSuccess")}
        </p>
      )}

      {groupInviteError && !tableMissing && filter === "active" && (
        <p className="text-sm text-red-600" role="alert">
          {groupInviteError}
        </p>
      )}

      {tableMissing && (
        <p className="text-sm text-muted">{collaborationsSetupError()}</p>
      )}

      {filter === "active" && (
        <div className="space-y-8">
          <GroupMemberInvitesSection
            invites={memberInvites}
            onResponded={refreshList}
          />

          <GroupCollabInvitesSection
            received={groupReceived}
            sent={groupSent}
            onResponded={refreshList}
          />

          {renderPreviewList(false)}
        </div>
      )}

      {filter === "paused" && renderPreviewList(false)}

      {filter === "past" && (
        <div className="space-y-8">
          {renderPreviewList(true)}

          {archivedPreviews.length > 0 && (
            <section>
              <h2 className="section-heading">{t("hidden")}</h2>
              <p className="section-copy">{t("hiddenCopy")}</p>
              {restoreError && (
                <p className="mt-3 text-sm text-red-600" role="alert">
                  {restoreError}
                </p>
              )}
              <ul className="mt-4 space-y-2">
                {archivedPreviews.map((preview) => {
                  const name = preview.isGroup
                    ? t("groupTitle")
                    : preview.other?.first_name ?? preview.other?.username ?? t("defaultMusicianName");
                  const focusLine = collaborationFocusLine(preview);
                  return (
                    <li
                      key={preview.id}
                      className="surface flex flex-wrap items-start justify-between gap-4 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/collaborations/${preview.id}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {name}
                        </Link>
                        <p className="mt-1 truncate text-sm text-muted">{focusLine}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => restoreCollaboration(preview.id)}
                        disabled={actingId === preview.id}
                        className="btn-secondary btn-sm shrink-0"
                      >
                        {actingId === preview.id ? tc("restoring") : t("restoreToList")}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
