"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase";
import { ProfileAttribution } from "@/components/ProfileAttribution";
import { UserSafetyActions, type SafetyDialog } from "@/components/UserSafetyActions";
import type { CollaborationEntry, CollaborationEntryType } from "@/lib/types";
import {
  addCollaborationEntry,
  collaborationFocusLine,
  collaborationQuietLine,
  collaborationsSetupError,
  deleteCollaborationEntry,
  loadCollaborationDetail,
  toggleCollaborationStep,
  updateCollaborationStatus,
  type CollaborationDetail,
} from "@/lib/collaborations";
import { collaborationStatusLabel, translatePace } from "@/lib/i18n/labels";
import {
  formatMemberNames,
  GROUP_COLLAB_MAX_MEMBERS,
  inviteGroupCollabMember,
} from "@/lib/group-collaborations";
import { GroupCollabChat } from "@/components/GroupCollabChat";
import { CollabAlignmentPanel } from "@/components/CollabAlignmentPanel";
import { NavCloudBackdrop } from "@/components/NavCloudBackdrop";
import {
  subscribeToCollaboration,
  unsubscribeFromCollaboration,
} from "@/lib/collaboration-realtime";
import { useCollab } from "@/components/CollabProvider";
import { NotFoundPanel } from "@/components/NotFoundPanel";
import { PageLoading } from "@/components/PageLoading";
import {
  hideCollaborationFromList,
  loadArchivedCollaborationIds,
  permanentlyDeleteCollaboration,
  restoreCollaborationToList,
} from "@/lib/collaboration-archive";

type Tab = CollaborationEntryType | "chat";
type ModalKind = "pause" | "end" | "remove" | "delete" | null;

const inputClass =
  "mt-1 block w-full rounded-md border border-foreground/20 bg-white px-3 py-2 text-foreground placeholder:text-muted focus:border-foreground/40 focus:outline-none";

export default function CollaborationWorkspacePage() {
  const t = useTranslations("collaborations");
  const tc = useTranslations("common");
  const tStatus = useTranslations("status");
  const tPace = useTranslations("pace");
  const params = useParams();
  const router = useRouter();
  const collaborationId = params.id as string;
  const { markRead: markCollabRead, refresh: refreshCollabInbox } = useCollab();

  const [detail, setDetail] = useState<CollaborationDetail | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("note");
  const [noteBody, setNoteBody] = useState("");
  const [refTitle, setRefTitle] = useState("");
  const [refUrl, setRefUrl] = useState("");
  const [stepBody, setStepBody] = useState("");
  const [acting, setActing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<ModalKind>(null);
  const [safetyDialog, setSafetyDialog] = useState<SafetyDialog>(null);
  const [contextOpen, setContextOpen] = useState(true);
  const [isArchived, setIsArchived] = useState(false);

  const [inviteUserId, setInviteUserId] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);

  const isActive = detail?.status === "active";
  const isPendingAlignment = detail?.status === "pending_alignment";
  const isGroup = detail?.isGroup ?? false;

  const workspaceTabs = useMemo(() => {
    const base: Array<{ id: Tab; label: string }> = [
      { id: "note", label: t("tabNotes") },
      { id: "reference", label: t("tabReferences") },
      { id: "step", label: t("tabSteps") },
    ];
    if (isGroup) base.unshift({ id: "chat", label: t("tabGroupChat") });
    return base;
  }, [isGroup, t]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.replace("/sign-in");
        return;
      }
      setUserId(user.id);

      void loadArchivedCollaborationIds(user.id).then((ids) => {
        setIsArchived(ids.has(collaborationId));
      });

      const result = await loadCollaborationDetail(collaborationId, user.id);
      setDetail(result.detail);
      setTableMissing(result.tableMissing);
      setLoadError(result.loadError ?? null);
      if (result.detail?.isGroup) {
        setTab("chat");
        const supabase = createClient();
        const { data: member } = await supabase
          .from("collaboration_members")
          .select("is_creator")
          .eq("collaboration_id", collaborationId)
          .eq("user_id", user.id)
          .maybeSingle();
        setIsCreator(Boolean(member?.is_creator));
      }
      setLoading(false);
    });
  }, [collaborationId, router]);

  useEffect(() => {
    if (!userId || loading) return;

    const channel = subscribeToCollaboration(collaborationId, {
      onEntryInsert: (entry) => {
        setDetail((prev) => {
          if (!prev || prev.entries.some((existing) => existing.id === entry.id)) return prev;
          const activityAt = entry.updated_at ?? entry.created_at;
          markCollabRead(collaborationId, activityAt);
          return {
            ...prev,
            entries: [...prev.entries, entry],
            lastActivityAt: activityAt,
            lastEntryAuthorId: entry.author_id,
          };
        });
      },
      onEntryUpdate: (entry) => {
        setDetail((prev) => {
          if (!prev) return prev;
          const activityAt = entry.updated_at ?? entry.created_at;
          return {
            ...prev,
            entries: prev.entries.map((existing) =>
              existing.id === entry.id ? entry : existing,
            ),
            lastActivityAt: activityAt,
          };
        });
      },
      onEntryDelete: (entry) => {
        setDetail((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            entries: prev.entries.filter((existing) => existing.id !== entry.id),
          };
        });
      },
      onCollaborationUpdate: (collaboration) => {
        setDetail((prev) => (prev ? { ...prev, ...collaboration } : prev));
      },
    });

    return () => {
      void unsubscribeFromCollaboration(channel);
    };
  }, [collaborationId, userId, loading]);

  useEffect(() => {
    if (!detail || !userId || detail.status === "pending_alignment") return;
    markCollabRead(detail.id, detail.lastActivityAt);
  }, [detail?.id, detail?.lastActivityAt, detail?.status, userId, markCollabRead]);

  const tabEntries = useMemo(() => {
    if (!detail || tab === "chat") return [];
    return detail.entries.filter((entry) => entry.entry_type === tab);
  }, [detail, tab]);

  async function refreshDetail() {
    if (!userId) return;
    const result = await loadCollaborationDetail(collaborationId, userId);
    setDetail(result.detail);
    setTableMissing(result.tableMissing);
    setLoadError(result.loadError ?? null);
  }

  async function handleAddEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!detail || !userId || !isActive || tab === "chat") return;
    setActing(true);
    setFormError(null);

    let body: string | null = null;
    let url: string | null = null;

    if (tab === "note") {
      body = noteBody.trim();
      if (!body) {
        setFormError("Write a note first.");
        setActing(false);
        return;
      }
    } else if (tab === "reference") {
      url = refUrl.trim();
      body = refTitle.trim() || null;
      if (!url) {
        setFormError("Add a link first.");
        setActing(false);
        return;
      }
    } else {
      body = stepBody.trim();
      if (!body) {
        setFormError("Write a next step first.");
        setActing(false);
        return;
      }
    }

    const result = await addCollaborationEntry({
      collaborationId: detail.id,
      userId,
      entryType: tab,
      body,
      url,
    });

    setActing(false);
    if (result.error) {
      setFormError(result.error);
      return;
    }

    if (tab === "note") setNoteBody("");
    if (tab === "reference") {
      setRefTitle("");
      setRefUrl("");
    }
    if (tab === "step") setStepBody("");
    await refreshDetail();
    void refreshCollabInbox();
  }

  async function handleToggleStep(entry: CollaborationEntry) {
    if (!isActive) return;
    await toggleCollaborationStep(entry.id, !entry.is_done);
    await refreshDetail();
  }

  async function handleDeleteEntry(entryId: string) {
    if (!isActive) return;
    await deleteCollaborationEntry(entryId);
    await refreshDetail();
  }

  async function handleStatusChange(status: "active" | "paused" | "ended") {
    if (!detail || !userId) return;
    setActing(true);
    const result = await updateCollaborationStatus(
      detail.id,
      status,
      userId,
      detail.chat_invite_id
    );
    setActing(false);
    setModal(null);
    setMenuOpen(false);
    if (result.error) {
      setActionError(result.error);
      return;
    }
    setActionError(null);
    await refreshDetail();
    if (status === "ended") router.push("/collaborations");
  }

  async function handleRemoveFromList() {
    if (!userId) return;
    setActing(true);
    const { error } = await hideCollaborationFromList(userId, collaborationId);
    setActing(false);
    setModal(null);
    setMenuOpen(false);

    if (error) {
      setActionError(error);
      return;
    }

    setActionError(null);
    setIsArchived(true);
    void refreshCollabInbox();
    router.push("/collaborations");
  }

  async function handleRestoreToList() {
    if (!userId) return;
    setActing(true);
    const { error } = await restoreCollaborationToList(userId, collaborationId);
    setActing(false);
    setMenuOpen(false);

    if (error) {
      setActionError(error);
      return;
    }

    setActionError(null);
    setIsArchived(false);
    void refreshCollabInbox();
  }

  async function handleDeletePermanently() {
    if (!userId) return;
    setActing(true);
    const { error } = await permanentlyDeleteCollaboration(userId, collaborationId);
    setActing(false);
    setModal(null);
    setMenuOpen(false);

    if (error) {
      setActionError(error);
      return;
    }

    setActionError(null);
    void refreshCollabInbox();
    router.push("/collaborations");
  }

  if (loading) return <PageLoading />;

  if (tableMissing) {
    return (
      <div>
        <p className="text-muted">{collaborationsSetupError()}</p>
        <Link href="/collaborations" className="mt-4 inline-block text-foreground underline hover:no-underline">
          ← Collaborations
        </Link>
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <p className="text-sm text-red-600" role="alert">
          {loadError}
        </p>
        <Link href="/collaborations" className="mt-4 inline-block text-foreground underline hover:no-underline">
          ← Collaborations
        </Link>
      </div>
    );
  }

  if (!detail || !userId) {
    return (
      <NotFoundPanel
        title={t("notFound")}
        description="This workspace may have ended, or you may not have access to it."
        backHref="/collaborations"
        backLabel="← Collaborations"
      />
    );
  }

  const otherName = detail.other?.first_name ?? detail.other?.username ?? "your collaborator";
  const otherId =
    detail.isGroup || !detail.invite
      ? detail.members?.[0]?.id ?? ""
      : detail.invite.sender_id === userId
        ? detail.invite.receiver_id
        : detail.invite.sender_id;
  const paceLabel = detail.isGroup
    ? detail.groupInvite?.pace
      ? translatePace(detail.groupInvite.pace, tPace)
      : null
    : detail.invite?.pace
      ? translatePace(detail.invite.pace, tPace)
      : null;
  const quietLine =
    detail.status !== "ended" ? collaborationQuietLine(detail.lastActivityAt) : null;
  const isNewWorkspace = detail.status === "active" && detail.entries.length === 0;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/collaborations" className="text-sm text-muted hover:text-foreground">
          ← Collaborations
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="page-lead">{detail.isGroup ? t("groupTitle") : t("detailTitle")}</h1>
            <p className="mt-1 text-sm text-muted">
              {detail.isGroup
                ? `with ${formatMemberNames(detail.members ?? [])}`
                : `with ${otherName}`}
            </p>
          </div>
          {!isPendingAlignment && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="btn-secondary btn-sm"
            >
              Options
            </button>
            {menuOpen && (
              <div className="surface absolute right-0 z-10 mt-2 w-52 py-1 shadow-lg">
                {detail.status === "active" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setModal("pause");
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-foreground hover:bg-foreground/5"
                  >
                    Pause collaboration
                  </button>
                )}
                {detail.status === "paused" && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange("active")}
                    disabled={acting}
                    className="block w-full px-4 py-2 text-left text-sm text-foreground hover:bg-foreground/5 disabled:opacity-50"
                  >
                    Resume collaboration
                  </button>
                )}
                {detail.status !== "ended" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setModal("end");
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-foreground hover:bg-foreground/5"
                  >
                    End collaboration
                  </button>
                )}
                {detail.status === "ended" && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setModal("remove");
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-foreground hover:bg-foreground/5"
                    >
                      {t("removeFromList")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setModal("delete");
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                    >
                      {t("deletePermanently")}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setSafetyDialog("report");
                  }}
                  className="block w-full px-4 py-2 text-left text-sm text-foreground hover:bg-foreground/5"
                >
                  Report
                </button>
              </div>
            )}
          </div>
          )}
        </div>
      </div>

      {isPendingAlignment && detail.invite && userId && (
        <CollabAlignmentPanel
          detail={detail}
          userId={userId}
          onActivated={(updated) => {
            setDetail(updated);
            void refreshCollabInbox();
          }}
        />
      )}

      <UserSafetyActions
        currentUserId={userId}
        reportedUserId={otherId}
        reportedUserName={otherName}
        targetType="user"
        targetId={otherId}
        showTriggers={false}
        dialog={safetyDialog}
        onDialogChange={setSafetyDialog}
      />

      <div className="surface p-4">
        <button
          type="button"
          onClick={() => setContextOpen((open) => !open)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="text-sm font-medium text-foreground">Why you connected</span>
          <span className="text-sm text-muted">{contextOpen ? "Hide" : "Show"}</span>
        </button>
        {contextOpen && (
          <div className="mt-3 space-y-2 text-sm text-muted">
            <p>
              <span className="text-foreground">Focus:</span> {collaborationFocusLine(detail)}
            </p>
            {detail.isGroup ? (
              <>
                {detail.groupInvite?.message && <p>{detail.groupInvite.message}</p>}
                {detail.groupInvite?.role && (
                  <p>
                    <span className="text-foreground">Role:</span> {detail.groupInvite.role}
                  </p>
                )}
              </>
            ) : (
              <>
                {detail.invite?.message && <p>{detail.invite.message}</p>}
                {detail.invite?.role && (
                  <p>
                    <span className="text-foreground">Role:</span> {detail.invite.role}
                  </p>
                )}
              </>
            )}
            {paceLabel && (
              <p>
                <span className="text-foreground">Pace:</span> {paceLabel}
              </p>
            )}
            <p className="italic">
              {detail.isGroup
                ? "You chose to explore this together. There's no rush."
                : "You both chose to explore this collaboration. There's no rush."}
            </p>
          </div>
        )}
      </div>

      {isNewWorkspace && (
        <p className="text-sm text-muted leading-relaxed italic">
          You both chose to explore this collaboration. There&apos;s no rush — start with a note,
          link, or next step when something comes to mind.
        </p>
      )}

      {quietLine && (
        <div className="surface flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="text-sm text-muted italic">{quietLine}</p>
          <div className="flex flex-wrap gap-2">
            {detail.status === "paused" && (
              <button
                type="button"
                onClick={() => handleStatusChange("active")}
                disabled={acting}
                className="btn-primary btn-sm"
              >
                Resume
              </button>
            )}
            {detail.status === "active" && (
              <button
                type="button"
                onClick={() => setModal("pause")}
                className="btn-secondary btn-sm"
              >
                Pause
              </button>
            )}
          </div>
        </div>
      )}

      {detail.status === "paused" && (
        <div className="surface px-4 py-3 text-sm text-muted">
          <p>This collaboration is paused. Notes and chat are on hold until someone resumes it.</p>
          {!quietLine && (
            <button
              type="button"
              onClick={() => handleStatusChange("active")}
              disabled={acting}
              className="btn-primary btn-sm mt-3"
            >
              Resume
            </button>
          )}
        </div>
      )}

      {isArchived && (
        <div className="surface px-4 py-3 text-sm">
          <p className="font-medium text-foreground">{t("hiddenFromListTitle")}</p>
          <p className="mt-1 text-muted">{t("hiddenFromListCopy")}</p>
          <button
            type="button"
            onClick={handleRestoreToList}
            disabled={acting}
            className="btn-secondary btn-sm mt-3"
          >
            {acting ? tc("restoring") : t("restoreToList")}
          </button>
        </div>
      )}

      {detail.status === "ended" && (
        <div className="surface space-y-3 px-4 py-3 text-sm text-muted">
          <p>{t("endedCopy")}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setModal("remove")}
              disabled={acting}
              className="btn-secondary btn-sm"
            >
              {t("removeFromList")}
            </button>
            <button
              type="button"
              onClick={() => setModal("delete")}
              disabled={acting}
              className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
            >
              {t("deletePermanently")}
            </button>
          </div>
          {!detail.isGroup && detail.other?.username && (
            <Link href={`/people/${detail.other.username}`} className="btn-secondary btn-sm inline-block">
              {t("startNewCollabWith", { name: otherName })}
            </Link>
          )}
          {actionError && (
            <p className="text-sm text-red-600" role="alert">
              {actionError}
            </p>
          )}
        </div>
      )}

      {detail.chat_invite_id && !detail.isGroup && (
        <Link
          href={`/messages/${detail.chat_invite_id}`}
          className="btn-secondary"
        >
          Open conversation with {otherName}
        </Link>
      )}

      {!isPendingAlignment && detail.isGroup && isCreator && isActive && (detail.members?.length ?? 0) < GROUP_COLLAB_MAX_MEMBERS - 1 && (
        <div className="surface p-4 space-y-2">
          <p className="text-sm font-medium text-foreground">Invite someone else</p>
          <p className="text-xs text-muted">
            Paste a profile user ID from Explore (up to {GROUP_COLLAB_MAX_MEMBERS} members total). They
            have 14 days to respond.
          </p>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              setInviteError(null);
              const trimmed = inviteUserId.trim();
              if (!trimmed) return;
              setActing(true);
              const result = await inviteGroupCollabMember(detail.id, trimmed);
              setActing(false);
              if (result.error) setInviteError(result.error);
              else setInviteUserId("");
            }}
          >
            <input
              type="text"
              value={inviteUserId}
              onChange={(e) => setInviteUserId(e.target.value)}
              className={inputClass}
              placeholder="User ID"
            />
            <button type="submit" disabled={acting} className="btn-secondary btn-sm">
              Send invite
            </button>
          </form>
          {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}
        </div>
      )}

      {!isPendingAlignment && (
      <div>
        <div className="flex flex-wrap gap-2 overflow-visible pb-2">
          {workspaceTabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`nav-pill relative text-sm ${
                tab === id
                  ? "nav-pill-active font-medium text-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <span className="nav-pill-label">
                {tab === id && <NavCloudBackdrop />}
                <span className="relative z-[1]">{label}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-4">
          {tab === "chat" && detail.isGroup && userId ? (
            <GroupCollabChat
              collaborationId={detail.id}
              userId={userId}
              initialMessages={detail.messages ?? []}
              disabled={!isActive}
            />
          ) : tabEntries.length === 0 ? (
            <p className="text-sm text-muted">Nothing here yet.</p>
          ) : (
            <ul className="space-y-3">
              {tabEntries.map((entry) => (
                <li
                  key={entry.id}
                  className="surface px-4 py-3"
                >
                  {entry.entry_type === "step" ? (
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={entry.is_done}
                        disabled={!isActive}
                        onChange={() => handleToggleStep(entry)}
                        className="mt-1"
                      />
                      <span className={entry.is_done ? "text-muted line-through" : "text-foreground"}>
                        {entry.body}
                      </span>
                    </label>
                  ) : entry.entry_type === "reference" ? (
                    <div>
                      {entry.body && <p className="font-medium text-foreground">{entry.body}</p>}
                      {entry.url && (
                        <a
                          href={entry.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block text-sm text-foreground underline hover:no-underline break-all"
                        >
                          {entry.url}
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-foreground whitespace-pre-wrap leading-relaxed">{entry.body}</p>
                  )}
                  {isActive && entry.author_id === userId && (
                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="mt-2 text-xs text-muted hover:text-foreground"
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {isActive && tab !== "chat" && (
            <form onSubmit={handleAddEntry} className="surface p-4 space-y-3">
              {tab === "note" && (
                <label className="block">
                  <span className="text-sm text-muted">Shared note</span>
                  <textarea
                    value={noteBody}
                    onChange={(e) => setNoteBody(e.target.value)}
                    rows={4}
                    className={inputClass}
                    placeholder="Ideas, context, things you want to remember together…"
                  />
                </label>
              )}
              {tab === "reference" && (
                <>
                  <label className="block">
                    <span className="text-sm text-muted">Label (optional)</span>
                    <input
                      type="text"
                      value={refTitle}
                      onChange={(e) => setRefTitle(e.target.value)}
                      className={inputClass}
                      placeholder="Demo, playlist, reference track…"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm text-muted">Link</span>
                    <input
                      type="url"
                      value={refUrl}
                      onChange={(e) => setRefUrl(e.target.value)}
                      className={inputClass}
                      placeholder="https://…"
                    />
                  </label>
                </>
              )}
              {tab === "step" && (
                <label className="block">
                  <span className="text-sm text-muted">Next step (optional checklist)</span>
                  <input
                    type="text"
                    value={stepBody}
                    onChange={(e) => setStepBody(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Share a rough demo, pick a time to jam…"
                  />
                </label>
              )}
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <button
                type="submit"
                disabled={acting}
                className="btn-primary"
              >
                {acting ? "Adding…" : tab === "note" ? "Add note" : tab === "reference" ? "Add link" : "Add step"}
              </button>
            </form>
          )}
        </div>
      </div>
      )}

      {actionError && (
        <p className="text-sm text-red-600" role="alert">
          {actionError}
        </p>
      )}

      <p className="text-xs text-muted">
        Status: {collaborationStatusLabel(detail.status, tStatus)} ·{" "}
        <ProfileAttribution profile={detail.other} />
      </p>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" role="dialog" aria-modal="true">
          <div className="surface max-w-md w-full p-6 shadow-lg">
            {modal === "pause" ? (
              <>
                <h2 className="section-heading">{t("pauseTitle")}</h2>
                <p className="mt-3 text-sm text-muted leading-relaxed">
                  Pausing keeps this space without pressure. Notes and chat pause for both of you until
                  someone resumes.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleStatusChange("paused")}
                    disabled={acting}
                    className="btn-primary"
                  >
                    Pause
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="btn-secondary"
                  >
                    {tc("cancel")}
                  </button>
                </div>
              </>
            ) : modal === "end" ? (
              <>
                <h2 className="section-heading">{t("endTitle")}</h2>
                <p className="mt-3 text-sm text-muted leading-relaxed">
                  Ending closes this space respectfully. No explanation is required.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleStatusChange("ended")}
                    disabled={acting}
                    className="btn-primary"
                  >
                    {tc("end")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="btn-secondary"
                  >
                    {tc("cancel")}
                  </button>
                </div>
              </>
            ) : modal === "remove" ? (
              <>
                <h2 className="section-heading">{t("removeTitle")}</h2>
                <p className="mt-3 text-sm text-muted leading-relaxed">{t("removeCopy")}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleRemoveFromList}
                    disabled={acting}
                    className="btn-primary"
                  >
                    {acting ? t("removing") : t("removeFromList")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="btn-secondary"
                  >
                    {tc("cancel")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="section-heading">{t("deleteTitle")}</h2>
                <p className="mt-3 text-sm text-muted leading-relaxed">{t("deleteCopy")}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleDeletePermanently}
                    disabled={acting}
                    className="rounded-md bg-red-800 px-4 py-2 text-sm font-medium text-white hover:bg-red-900 disabled:opacity-50"
                  >
                    {acting ? t("deleting") : t("deletePermanently")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="btn-secondary"
                  >
                    {tc("cancel")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
