"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase";
import type { ChatInvite, Profile, CollabInvite, CollaborationStatus } from "@/lib/types";
import { ConversationPreviewLink } from "@/components/ConversationPreviewLink";
import { ProfileAttribution } from "@/components/ProfileAttribution";
import { EmptyState } from "@/components/EmptyState";
import { useInbox } from "@/components/InboxProvider";
import {
  createCollaborationWorkspace,
  findOpenCollaborationBetweenUsers,
  withdrawCollabInvite,
} from "@/lib/collaborations";
import { notifyCollabResponse } from "@/lib/notifications/client";
import { loadBlockedUserIds } from "@/lib/blocks";
import { PROFILE_ATTRIBUTION_FIELDS } from "@/lib/profile";
import { loadConversationPreviews, type ConversationPreview } from "@/lib/conversations";
import {
  conversationStatusLabel,
  inviteResponseLabel,
  translatePace,
  translateProfileOption,
} from "@/lib/i18n/labels";
import { restoreConversationToList } from "@/lib/conversation-archive";
import { loadPendingGroupCollabInvitesForUser } from "@/lib/group-collaborations";
import { GroupCollabInvitesSection } from "@/components/GroupCollabInvitesSection";
import type { GroupCollabInviteWithMeta } from "@/lib/group-collaborations";

export default function MessagesPage() {
  const router = useRouter();
  const t = useTranslations("messages");
  const tc = useTranslations("common");
  const tInvite = useTranslations("inviteResponses");
  const tStatus = useTranslations("status");
  const tProfileOptions = useTranslations("profileOptions");
  const tPace = useTranslations("pace");
  const { userId, conversations, loading: inboxLoading, refresh: refreshInbox } = useInbox();
  const [receivedInvites, setReceivedInvites] = useState<(ChatInvite & { sender?: Profile })[]>([]);
  const [sentInvites, setSentInvites] = useState<(ChatInvite & { receiver?: Profile })[]>([]);
  const [receivedCollabInvites, setReceivedCollabInvites] = useState<(CollabInvite & { sender?: Profile })[]>([]);
  const [maybeCollabInvites, setMaybeCollabInvites] = useState<(CollabInvite & { sender?: Profile })[]>([]);
  const [sentCollabInvites, setSentCollabInvites] = useState<
    (CollabInvite & { receiver?: Profile; workspaceId?: string | null; workspaceStatus?: CollaborationStatus | null })[]
  >([]);
  const [groupReceived, setGroupReceived] = useState<GroupCollabInviteWithMeta[]>([]);
  const [groupSent, setGroupSent] = useState<GroupCollabInviteWithMeta[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [archivedConversations, setArchivedConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      if (!inboxLoading) router.replace("/sign-in");
      return;
    }

    const supabase = createClient();

    Promise.all([
        supabase
          .from("chat_invites")
          .select("*")
          .eq("receiver_id", userId)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
        supabase
          .from("chat_invites")
          .select("*")
          .eq("sender_id", userId)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
        supabase
          .from("collab_invites")
          .select("*")
          .eq("receiver_id", userId)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
        supabase
          .from("collab_invites")
          .select("*")
          .eq("sender_id", userId)
          .in("status", ["pending", "interested", "maybe"])
          .order("created_at", { ascending: false }),
        supabase
          .from("collab_invites")
          .select("*")
          .eq("receiver_id", userId)
          .eq("status", "maybe")
          .order("created_at", { ascending: false }),
      ]).then(async ([recvRes, sentRes, collabRecvRes, collabSentRes, collabMaybeRes]) => {
        const { blockedIds } = await loadBlockedUserIds(userId);
        const recv = ((recvRes.data ?? []) as ChatInvite[]).filter(
          (inv) => !blockedIds.has(inv.sender_id)
        );
        const sent = ((sentRes.data ?? []) as ChatInvite[]).filter(
          (inv) => !blockedIds.has(inv.receiver_id)
        );

        const loadProfiles = (
          ids: string[],
          setter: (list: (ChatInvite & { sender?: Profile; receiver?: Profile })[]) => void,
          list: ChatInvite[],
          key: "sender" | "receiver",
          idPicker: (inv: ChatInvite) => string
        ) => {
          if (ids.length === 0) {
            setter(list.map((i) => ({ ...i })));
            return;
          }
          supabase.from("profiles").select(PROFILE_ATTRIBUTION_FIELDS).in("id", ids).then((pRes) => {
            const byId: Record<string, Profile> = {};
            (pRes.data ?? []).forEach((row) => { byId[row.id] = row as Profile; });
            setter(list.map((i) => ({ ...i, [key]: byId[idPicker(i)] })));
          });
        };

        loadProfiles(recv.map((i) => i.sender_id), setReceivedInvites as (a: (ChatInvite & { sender?: Profile })[]) => void, recv, "sender", (i) => i.sender_id);
        loadProfiles(sent.map((i) => i.receiver_id), setSentInvites as (a: (ChatInvite & { receiver?: Profile })[]) => void, sent, "receiver", (i) => i.receiver_id);

        const collabsReceived = ((collabRecvRes.data ?? []) as CollabInvite[]).filter(
          (c) => !blockedIds.has(c.sender_id)
        );
        if (collabsReceived.length > 0) {
          supabase.from("profiles").select(PROFILE_ATTRIBUTION_FIELDS).in("id", collabsReceived.map((c) => c.sender_id)).then((pRes) => {
            const byId: Record<string, Profile> = {};
            (pRes.data ?? []).forEach((row) => { byId[row.id] = row as Profile; });
            setReceivedCollabInvites(collabsReceived.map((c) => ({ ...c, sender: byId[c.sender_id] })));
          });
        } else setReceivedCollabInvites([]);

        const collabsSent = ((collabSentRes.data ?? []) as CollabInvite[]).filter(
          (c) => !blockedIds.has(c.receiver_id)
        );
        if (collabsSent.length > 0) {
          supabase.from("profiles").select(PROFILE_ATTRIBUTION_FIELDS).in("id", collabsSent.map((c) => c.receiver_id)).then(async (pRes) => {
            const byId: Record<string, Profile> = {};
            (pRes.data ?? []).forEach((row) => { byId[row.id] = row as Profile; });
            const withWorkspace = await Promise.all(
              collabsSent.map(async (c) => {
                if (c.status !== "interested") {
                  return { ...c, receiver: byId[c.receiver_id], workspaceId: null, workspaceStatus: null };
                }
                const { data: workspace } = await supabase
                  .from("collaborations")
                  .select("id, status")
                  .eq("collab_invite_id", c.id)
                  .maybeSingle();
                return {
                  ...c,
                  receiver: byId[c.receiver_id],
                  workspaceId: workspace?.id ?? null,
                  workspaceStatus: (workspace?.status as CollaborationStatus | undefined) ?? null,
                };
              })
            );
            setSentCollabInvites(withWorkspace);
          });
        } else setSentCollabInvites([]);

        const collabsMaybe = ((collabMaybeRes.data ?? []) as CollabInvite[]).filter(
          (c) => !blockedIds.has(c.sender_id)
        );
        if (collabsMaybe.length > 0) {
          supabase.from("profiles").select(PROFILE_ATTRIBUTION_FIELDS).in("id", collabsMaybe.map((c) => c.sender_id)).then((pRes) => {
            const byId: Record<string, Profile> = {};
            (pRes.data ?? []).forEach((row) => { byId[row.id] = row as Profile; });
            setMaybeCollabInvites(collabsMaybe.map((c) => ({ ...c, sender: byId[c.sender_id] })));
          });
        } else setMaybeCollabInvites([]);
      }).finally(() => setLoading(false));
  }, [router, userId, inboxLoading]);

  useEffect(() => {
    if (!userId) {
      setGroupReceived([]);
      setGroupSent([]);
      return;
    }
    loadPendingGroupCollabInvitesForUser(userId).then((result) => {
      setGroupReceived(result.received);
      setGroupSent(result.sent);
    });
  }, [userId, refreshKey]);

  useEffect(() => {
    if (!userId) {
      setArchivedConversations([]);
      return;
    }
    loadConversationPreviews(userId, { archivedOnly: true }).then(setArchivedConversations);
  }, [userId, conversations.length]);

  async function restoreConversation(inviteId: string) {
    if (!userId) return;
    setActingId(inviteId);
    setRestoreError(null);
    const { error } = await restoreConversationToList(userId, inviteId);
    setActingId(null);
    if (error) {
      setRestoreError(error);
      return;
    }
    setArchivedConversations((prev) => prev.filter((c) => c.id !== inviteId));
    await refreshInbox();
  }

  async function acceptInvite(inviteId: string) {
    const supabase = createClient();
    setActingId(inviteId);
    await supabase.from("chat_invites").update({ status: "accepted" }).eq("id", inviteId);
    setReceivedInvites((prev) => prev.filter((i) => i.id !== inviteId));
    setActingId(null);
    router.push(`/messages/${inviteId}`);
  }

  async function declineInvite(inviteId: string) {
    const supabase = createClient();
    setActingId(inviteId);
    await supabase.from("chat_invites").update({ status: "declined" }).eq("id", inviteId);
    setReceivedInvites((prev) => prev.filter((i) => i.id !== inviteId));
    setActingId(null);
  }

  async function cancelInvite(inviteId: string) {
    const supabase = createClient();
    setActingId(inviteId);
    await supabase.from("chat_invites").update({ status: "cancelled" }).eq("id", inviteId);
    setSentInvites((prev) => prev.filter((i) => i.id !== inviteId));
    setActingId(null);
  }

  async function cancelCollabInvite(collabId: string) {
    setActingId(collabId);
    const result = await withdrawCollabInvite(collabId);
    setActingId(null);
    if (result.error) {
      window.alert(result.error);
      return;
    }
    setSentCollabInvites((prev) => prev.filter((c) => c.id !== collabId));
  }

  function canWithdrawSentCollabInvite(
    invite: (typeof sentCollabInvites)[number],
  ): boolean {
    if (invite.status === "pending" || invite.status === "maybe") return true;
    if (invite.status !== "interested") return false;
    if (!invite.workspaceId) return true;
    return invite.workspaceStatus === "pending_alignment";
  }

  async function respondToCollab(collabId: string, response: "interested" | "maybe" | "not_fit") {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setActingId(collabId);

    const collab =
      receivedCollabInvites.find((c) => c.id === collabId) ??
      maybeCollabInvites.find((c) => c.id === collabId);
    if (response === "interested" && collab) {
      const existing = await findOpenCollaborationBetweenUsers(user.id, collab.sender_id);
      if (existing) {
        setActingId(null);
        window.alert(t("errors.alreadyOpenCollab"));
        router.push(`/collaborations/${existing.collaborationId}`);
        return;
      }
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("collab_invites")
      .update({
        status: response,
        ...(response === "interested" ? { invitee_aligned_at: now } : {}),
      })
      .eq("id", collabId);

    if (updateError) {
      setActingId(null);
      window.alert(updateError.message);
      return;
    }

    setReceivedCollabInvites((prev) => prev.filter((c) => c.id !== collabId));
    setMaybeCollabInvites((prev) => prev.filter((c) => c.id !== collabId));
    setActingId(null);

    if (response === "interested" && collab) {
      const workspace = await createCollaborationWorkspace(collabId, null);
      if (workspace.error && !workspace.id) {
        window.alert(
          workspace.tableMissing
            ? workspace.error
            : workspace.error || t("errors.collabWorkspaceFailed"),
        );
        return;
      }
      notifyCollabResponse(collabId, { collaborationId: workspace.id });
      if (workspace.id) {
        router.push(`/collaborations/${workspace.id}`);
      }
    } else {
      notifyCollabResponse(collabId);
    }
  }

  if (loading || inboxLoading) return <p className="text-muted">{tc("loading")}</p>;

  const hasSentInvites =
    sentInvites.length > 0 || sentCollabInvites.length > 0 || groupSent.length > 0;
  const isEmptyInbox =
    receivedInvites.length === 0 &&
    receivedCollabInvites.length === 0 &&
    maybeCollabInvites.length === 0 &&
    groupReceived.length === 0 &&
    !hasSentInvites &&
    conversations.length === 0;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="page-lead">{t("title")}</h1>
        <p className="section-copy">{t("subtitle")}</p>
      </div>

      {isEmptyInbox ? (
        <EmptyState
          title={t("empty")}
          description={t("emptyDescription")}
        >
          <Link href="/explore" className="btn-secondary">
            {t("explorePeople")}
          </Link>
          <Link href="/rooms" className="btn-secondary">
            {t("visitRoom")}
          </Link>
        </EmptyState>
      ) : (
        <>
      <section>
        <h2 className="section-heading">{t("receivedInvites")}</h2>
        <p className="section-copy">{t("receivedInvitesCopy")}</p>
        {receivedInvites.length === 0 ? (
          <p className="mt-4 text-sm text-muted">{t("noPendingChatInvites")}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {receivedInvites.map((inv) => (
              <li key={inv.id} className="surface p-4">
                <ProfileAttribution profile={inv.sender} className="font-medium" />
                {inv.optional_message && <p className="mt-1 text-sm text-muted">{inv.optional_message}</p>}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => acceptInvite(inv.id)}
                    disabled={actingId === inv.id}
                    className="btn-primary btn-sm"
                  >
                    {tc("accept")}
                  </button>
                  <button
                    type="button"
                    onClick={() => declineInvite(inv.id)}
                    disabled={actingId === inv.id}
                    className="btn-secondary btn-sm"
                  >
                    {t("notAFit")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {maybeCollabInvites.length > 0 && (
        <section>
          <h2 className="section-heading">{t("maybeCollabInvites")}</h2>
          <p className="section-copy">{t("maybeCollabInvitesCopy")}</p>
          <ul className="mt-4 space-y-3">
            {maybeCollabInvites.map((c) => (
              <li key={c.id} className="surface p-4">
                <ProfileAttribution profile={c.sender} className="font-medium" />
                <p className="text-sm text-muted mt-1">{t("aboutLabel", { about: c.about })}</p>
                {c.message && <p className="text-sm text-muted">{c.message}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => respondToCollab(c.id, "interested")}
                    disabled={actingId === c.id}
                    className="btn-primary btn-sm"
                  >
                    {t("revisitInterested")}
                  </button>
                  <button
                    type="button"
                    onClick={() => respondToCollab(c.id, "not_fit")}
                    disabled={actingId === c.id}
                    className="btn-secondary btn-sm"
                  >
                    {t("notAFit")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {receivedCollabInvites.length > 0 && (
        <section>
          <h2 className="section-heading">{t("receivedCollabInvites")}</h2>
          <p className="section-copy">{t("receivedCollabInvitesCopy")}</p>
          <ul className="mt-4 space-y-3">
            {receivedCollabInvites.map((c) => (
              <li key={c.id} className="surface p-4">
                <ProfileAttribution profile={c.sender} className="font-medium" />
                <p className="text-sm text-muted mt-1">{t("aboutLabel", { about: c.about })}</p>
                {c.message && <p className="text-sm text-muted">{c.message}</p>}
                {c.role && (
                  <p className="text-sm text-muted">
                    {t("theirRole", { role: translateProfileOption(c.role, tProfileOptions) })}
                  </p>
                )}
                {c.pace && (
                  <p className="text-sm text-muted">
                    {t("paceLabel", { pace: translatePace(c.pace, tPace) })}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => respondToCollab(c.id, "interested")} disabled={actingId === c.id} className="btn-primary btn-sm">{t("interestedLetsTalk")}</button>
                  <button type="button" onClick={() => respondToCollab(c.id, "maybe")} disabled={actingId === c.id} className="btn-secondary btn-sm">{t("maybeNotNow")}</button>
                  <button type="button" onClick={() => respondToCollab(c.id, "not_fit")} disabled={actingId === c.id} className="btn-secondary btn-sm">{t("notAFit")}</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <GroupCollabInvitesSection
        received={groupReceived}
        sent={groupSent}
        onResponded={() => setRefreshKey((key) => key + 1)}
      />

      <section>
        <h2 className="section-heading">{t("sentInvites")}</h2>
        <p className="section-copy">{t("sentInvitesCopy")}</p>
        {!hasSentInvites ? (
          <p className="mt-4 text-sm text-muted">{t("noPendingInvitesOut")}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {sentInvites.map((inv) => (
              <li
                key={`chat-${inv.id}`}
                className="surface flex flex-wrap items-start justify-between gap-4 px-4 py-3"
              >
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">{t("chatInviteLabel")}</p>
                  <ProfileAttribution profile={inv.receiver} className="mt-1 font-medium" />
                  {inv.optional_message && (
                    <p className="mt-1 text-sm text-muted">&ldquo;{inv.optional_message}&rdquo;</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => cancelInvite(inv.id)}
                  disabled={actingId === inv.id}
                  className="btn-secondary btn-sm shrink-0"
                >
                  {t("cancelInvite")}
                </button>
              </li>
            ))}
            {sentCollabInvites.map((c) => (
              <li
                key={`collab-${c.id}`}
                className="surface flex flex-wrap items-start justify-between gap-4 px-4 py-3"
              >
                <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">{t("collabInviteLabel")}</p>
                <ProfileAttribution profile={c.receiver} className="mt-1 font-medium" />
                <p className="mt-1 text-sm text-muted">{t("aboutLabel", { about: c.about })}</p>
                {c.message && <p className="text-sm text-muted">{c.message}</p>}
                {c.role && (
                  <p className="text-sm text-muted">
                    {t("yourRole", { role: translateProfileOption(c.role, tProfileOptions) })}
                  </p>
                )}
                {c.pace && (
                  <p className="text-sm text-muted">
                    {t("paceLabel", { pace: translatePace(c.pace, tPace) })}
                  </p>
                )}
                {c.status === "interested" && c.workspaceId ? (
                  c.workspaceStatus === "pending_alignment" && c.invitee_aligned_at && !c.inviter_aligned_at ? (
                    <Link
                      href={`/collaborations/${c.workspaceId}`}
                      className="mt-2 inline-block text-sm font-medium text-foreground underline hover:no-underline"
                    >
                      {t("confirmCollaboration")}
                    </Link>
                  ) : c.workspaceStatus === "pending_alignment" ? (
                    <Link
                      href={`/collaborations/${c.workspaceId}`}
                      className="mt-2 inline-block text-sm text-foreground underline hover:no-underline"
                    >
                      {t("viewAlignmentProgress")}
                    </Link>
                  ) : (
                    <Link
                      href={`/collaborations/${c.workspaceId}`}
                      className="mt-2 inline-block text-sm text-foreground underline hover:no-underline"
                    >
                      {t("openCollaborationSpace")}
                    </Link>
                  )
                ) : c.status === "maybe" ? (
                  <p className="mt-2 text-xs text-muted italic">{t("maybeLaterSentNote")}</p>
                ) : c.status === "pending" ? (
                  <p className="mt-2 text-xs text-muted italic">{inviteResponseLabel("waiting", tInvite)}</p>
                ) : (
                  <p className="mt-2 text-xs text-muted italic">{inviteResponseLabel(c.status as "interested" | "maybe" | "not_fit", tInvite)}</p>
                )}
                </div>
                {canWithdrawSentCollabInvite(c) && (
                  <button
                    type="button"
                    onClick={() => cancelCollabInvite(c.id)}
                    disabled={actingId === c.id}
                    className="btn-secondary btn-sm shrink-0"
                  >
                    {t("cancelInvite")}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="section-heading">{t("conversations")}</h2>
        <p className="section-copy">{t("conversationsCopy")}</p>
        {conversations.length === 0 ? (
          <p className="mt-4 text-sm text-muted">{t("noConversationsYet")}</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {conversations.map((conv) => (
              <li key={conv.id}>
                <ConversationPreviewLink conversation={conv} />
              </li>
            ))}
          </ul>
        )}
      </section>
        </>
      )}

      {archivedConversations.length > 0 && (
        <section>
          <h2 className="section-heading">{t("hidden")}</h2>
          <p className="section-copy">{t("hiddenCopy")}</p>
          {restoreError && (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {restoreError}
            </p>
          )}
          <ul className="mt-4 space-y-2">
            {archivedConversations.map((conv) => {
              const name = conv.other?.first_name ?? conv.other?.username ?? t("someone");
              const statusLabel = conversationStatusLabel(conv.conversation_status, tStatus);
              return (
                <li
                  key={conv.id}
                  className="surface flex flex-wrap items-start justify-between gap-4 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/messages/${conv.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {name}
                    </Link>
                    {statusLabel && (
                      <span className="ml-2 text-xs text-muted">· {statusLabel}</span>
                    )}
                    <p className="mt-1 truncate text-sm text-muted">{conv.preview}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => restoreConversation(conv.id)}
                    disabled={actingId === conv.id}
                    className="btn-secondary btn-sm shrink-0"
                  >
                    {actingId === conv.id ? tc("restoring") : tc("restore")}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
