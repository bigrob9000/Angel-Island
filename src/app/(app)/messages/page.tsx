"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { ChatInvite, Profile, CollabInvite } from "@/lib/types";
import { ConversationPreviewLink } from "@/components/ConversationPreviewLink";
import { ProfileAttribution } from "@/components/ProfileAttribution";
import { EmptyState } from "@/components/EmptyState";
import { useInbox } from "@/components/InboxProvider";
import { createCollaborationWorkspace, findCollaborationIdByInvite } from "@/lib/collaborations";
import { notifyCollabResponse } from "@/lib/notifications/client";
import { loadBlockedUserIds } from "@/lib/blocks";
import { PROFILE_ATTRIBUTION_FIELDS } from "@/lib/profile";

const PACE_LABELS: Record<string, string> = { "low-pressure": "Low-pressure", "structured": "Structured", "flexible": "Flexible" };

export default function MessagesPage() {
  const router = useRouter();
  const { userId, conversations, loading: inboxLoading } = useInbox();
  const [receivedInvites, setReceivedInvites] = useState<(ChatInvite & { sender?: Profile })[]>([]);
  const [sentInvites, setSentInvites] = useState<(ChatInvite & { receiver?: Profile })[]>([]);
  const [receivedCollabInvites, setReceivedCollabInvites] = useState<(CollabInvite & { sender?: Profile })[]>([]);
  const [sentCollabInvites, setSentCollabInvites] = useState<(CollabInvite & { receiver?: Profile; workspaceId?: string | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

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
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
      ]).then(async ([recvRes, sentRes, collabRecvRes, collabSentRes]) => {
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
              collabsSent.map(async (c) => ({
                ...c,
                receiver: byId[c.receiver_id],
                workspaceId: c.status === "interested" ? await findCollaborationIdByInvite(c.id) : null,
              }))
            );
            setSentCollabInvites(withWorkspace);
          });
        } else setSentCollabInvites([]);
      }).finally(() => setLoading(false));
  }, [router, userId, inboxLoading]);

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

  async function respondToCollab(collabId: string, response: "interested" | "maybe" | "not_fit") {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setActingId(collabId);

    const collab = receivedCollabInvites.find((c) => c.id === collabId);
    await supabase.from("collab_invites").update({ status: response }).eq("id", collabId);

    setReceivedCollabInvites((prev) => prev.filter((c) => c.id !== collabId));
    setActingId(null);
    notifyCollabResponse(collabId);

    if (response === "interested" && collab) {
      const context = `Collab: ${collab.about}${collab.role ? `. Role: ${collab.role}` : ""}${collab.pace ? `. Pace: ${PACE_LABELS[collab.pace]}` : ""}`;
      const { data: newChat } = await supabase
        .from("chat_invites")
        .insert({
          sender_id: user.id,
          receiver_id: collab.sender_id,
          status: "accepted",
          optional_message: context,
        })
        .select("id")
        .single();

      const workspace = await createCollaborationWorkspace(collabId, newChat?.id ?? null);
      if (workspace.id) {
        router.push(`/collaborations/${workspace.id}`);
      } else if (newChat) {
        router.push(`/messages/${newChat.id}`);
      }
    }
  }

  if (loading || inboxLoading) return <p className="text-muted">Loading…</p>;

  const hasSentInvites = sentInvites.length > 0 || sentCollabInvites.length > 0;
  const isEmptyInbox =
    receivedInvites.length === 0 &&
    receivedCollabInvites.length === 0 &&
    !hasSentInvites &&
    conversations.length === 0;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-serif text-2xl font-medium text-foreground">Messages</h1>
        <p className="mt-2 text-sm text-muted">
          Invites and conversations — all by choice, no pressure to reply.
        </p>
      </div>

      {isEmptyInbox && (
        <EmptyState
          title="Nothing here yet."
          description="When someone invites you to chat, it shows up here. You can also reach out from Explore when you're ready."
        >
          <Link
            href="/explore"
            className="rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
          >
            Explore people
          </Link>
          <Link
            href="/rooms"
            className="rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
          >
            Visit a room
          </Link>
        </EmptyState>
      )}

      <section>
        <h2 className="font-serif text-lg font-medium text-foreground">Invites you received</h2>
        <p className="mt-1 text-sm text-muted">Accept to start a conversation. No obligation.</p>
        {receivedInvites.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No pending chat invites.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {receivedInvites.map((inv) => (
              <li key={inv.id} className="rounded-lg border border-foreground/10 bg-white/50 p-4">
                <ProfileAttribution profile={inv.sender} className="font-medium" />
                {inv.optional_message && <p className="mt-1 text-sm text-muted">{inv.optional_message}</p>}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => acceptInvite(inv.id)}
                    disabled={actingId === inv.id}
                    className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => declineInvite(inv.id)}
                    disabled={actingId === inv.id}
                    className="rounded-md border border-foreground/30 px-3 py-1.5 text-sm text-muted hover:text-foreground disabled:opacity-50"
                  >
                    Not a fit
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {receivedCollabInvites.length > 0 && (
        <section>
          <h2 className="font-serif text-lg font-medium text-foreground">Collab invites you received</h2>
          <p className="mt-1 text-sm text-muted">Respond below. If you&apos;re interested, you&apos;ll open a shared collaboration space.</p>
          <ul className="mt-4 space-y-3">
            {receivedCollabInvites.map((c) => (
              <li key={c.id} className="rounded-lg border border-foreground/10 bg-white/50 p-4">
                <ProfileAttribution profile={c.sender} className="font-medium" />
                <p className="text-sm text-muted mt-1">About: {c.about}</p>
                {c.message && <p className="text-sm text-muted">{c.message}</p>}
                {c.role && <p className="text-sm text-muted">Their role: {c.role}</p>}
                {c.pace && <p className="text-sm text-muted">Pace: {PACE_LABELS[c.pace]}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => respondToCollab(c.id, "interested")} disabled={actingId === c.id} className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50">Interested — let&apos;s talk</button>
                  <button type="button" onClick={() => respondToCollab(c.id, "maybe")} disabled={actingId === c.id} className="rounded-md border border-foreground/30 px-3 py-1.5 text-sm text-muted hover:text-foreground disabled:opacity-50">Maybe — not right now</button>
                  <button type="button" onClick={() => respondToCollab(c.id, "not_fit")} disabled={actingId === c.id} className="rounded-md border border-foreground/30 px-3 py-1.5 text-sm text-muted hover:text-foreground disabled:opacity-50">Not a fit</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="font-serif text-lg font-medium text-foreground">Invites you sent</h2>
        <p className="mt-1 text-sm text-muted">Waiting for a response. Chat invites can be cancelled.</p>
        {!hasSentInvites ? (
          <p className="mt-4 text-sm text-muted">No pending invites out.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {sentInvites.map((inv) => (
              <li
                key={`chat-${inv.id}`}
                className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-foreground/10 bg-white/40 px-4 py-3"
              >
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">Chat invite</p>
                  <ProfileAttribution profile={inv.receiver} className="mt-1 font-medium" />
                  {inv.optional_message && (
                    <p className="mt-1 text-sm text-muted">&ldquo;{inv.optional_message}&rdquo;</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => cancelInvite(inv.id)}
                  disabled={actingId === inv.id}
                  className="text-sm text-muted hover:text-foreground disabled:opacity-50 shrink-0"
                >
                  Cancel invite
                </button>
              </li>
            ))}
            {sentCollabInvites.map((c) => (
              <li
                key={`collab-${c.id}`}
                className="rounded-lg border border-foreground/10 bg-white/40 px-4 py-3"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Collab invite</p>
                <ProfileAttribution profile={c.receiver} className="mt-1 font-medium" />
                <p className="mt-1 text-sm text-muted">About: {c.about}</p>
                {c.message && <p className="text-sm text-muted">{c.message}</p>}
                {c.role && <p className="text-sm text-muted">Your role: {c.role}</p>}
                {c.pace && <p className="text-sm text-muted">Pace: {PACE_LABELS[c.pace]}</p>}
                {c.status === "interested" && c.workspaceId ? (
                  <Link
                    href={`/collaborations/${c.workspaceId}`}
                    className="mt-2 inline-block text-sm text-foreground underline hover:no-underline"
                  >
                    Open collaboration space
                  </Link>
                ) : (
                  <p className="mt-2 text-xs text-muted italic">Waiting for their response</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-serif text-lg font-medium text-foreground">Conversations</h2>
        <p className="mt-1 text-sm text-muted">Chats you started or accepted.</p>
        {conversations.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No conversations yet. Accept an invite to start one.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {conversations.map((conv) => (
              <li key={conv.id}>
                <ConversationPreviewLink conversation={conv} className="bg-white/50 hover:bg-white/70" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
