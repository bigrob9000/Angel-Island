import { isConversationUnread } from "@/lib/conversation-reads";
import { createClient } from "@/lib/supabase";
import type { Message } from "@/lib/types";
import type { ChatInvite, ConversationStatus, Profile } from "@/lib/types";
import { normalizeConversationStatus } from "@/lib/types";
import { loadBlockedUserIds } from "@/lib/blocks";
import { loadArchivedInviteIds } from "@/lib/conversation-archive";
import { PROFILE_ATTRIBUTION_FIELDS } from "@/lib/profile";

export type ConversationPreview = ChatInvite & {
  other?: Profile;
  preview: string;
  lastActivityAt: string;
  lastMessageSenderId?: string | null;
  unread?: boolean;
};

type InviteWithMessages = ChatInvite & {
  messages?: Array<{ body: string; created_at: string; sender_id: string }>;
};

export function conversationStatusLabel(status: ConversationStatus): string | null {
  if (status === "paused") return "Paused";
  if (status === "ended") return "Closed";
  return null;
}

export function isMessagingEnabled(status: ConversationStatus): boolean {
  return status === "active";
}

export function conversationPreviewText(
  lastMessage: string | undefined | null,
  optionalMessage: string | undefined | null
): string {
  const latest = lastMessage?.trim();
  if (latest) return latest;
  const context = optionalMessage?.trim();
  if (context) return context;
  return "No messages yet";
}

async function latestMessagesByInvite(
  inviteIds: string[]
): Promise<Record<string, { body: string; created_at: string; sender_id: string }>> {
  if (inviteIds.length === 0) return {};

  const supabase = createClient();
  const { data } = await supabase
    .from("messages")
    .select("invite_id, body, created_at, sender_id")
    .in("invite_id", inviteIds)
    .order("created_at", { ascending: false });

  const latest: Record<string, { body: string; created_at: string; sender_id: string }> = {};
  (data ?? []).forEach((msg) => {
    if (!latest[msg.invite_id]) {
      latest[msg.invite_id] = {
        body: msg.body,
        created_at: msg.created_at,
        sender_id: msg.sender_id,
      };
    }
  });
  return latest;
}

export async function loadConversationPreviews(
  userId: string,
  options?: { limit?: number; archivedOnly?: boolean },
): Promise<ConversationPreview[]> {
  const supabase = createClient();
  const [{ blockedIds }, archivedIds] = await Promise.all([
    loadBlockedUserIds(userId),
    loadArchivedInviteIds(userId),
  ]);

  const { data: convData, error } = await supabase
    .from("chat_invites")
    .select(
      `
      *,
      messages (
        body,
        created_at,
        sender_id
      )
    `
    )
    .eq("status", "accepted")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

  if (error || !convData?.length) return [];

  const convs = (convData as InviteWithMessages[]).filter((c) => {
    const otherId = c.sender_id === userId ? c.receiver_id : c.sender_id;
    if (blockedIds.has(otherId)) return false;
    const isArchived = archivedIds.has(c.id);
    if (options?.archivedOnly) return isArchived;
    return !isArchived;
  });
  const otherIds = [
    ...new Set(convs.map((c) => (c.sender_id === userId ? c.receiver_id : c.sender_id))),
  ];

  const [{ data: profiles }, latestByInvite] = await Promise.all([
    supabase.from("profiles").select(PROFILE_ATTRIBUTION_FIELDS).in("id", otherIds),
    latestMessagesByInvite(convs.map((c) => c.id)),
  ]);

  const profilesById: Record<string, Profile> = {};
  (profiles ?? []).forEach((row) => {
    profilesById[row.id] = row as Profile;
  });

  const previews: ConversationPreview[] = convs.map((inv) => {
    const nestedLatest = [...(inv.messages ?? [])].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
    const fetchedLatest = latestByInvite[inv.id];
    const latest = fetchedLatest ?? nestedLatest;
    const otherId = inv.sender_id === userId ? inv.receiver_id : inv.sender_id;

    return {
      id: inv.id,
      sender_id: inv.sender_id,
      receiver_id: inv.receiver_id,
      status: inv.status,
      optional_message: inv.optional_message,
      conversation_status: normalizeConversationStatus(inv.conversation_status),
      paused_at: inv.paused_at ?? null,
      paused_by: inv.paused_by ?? null,
      ended_at: inv.ended_at ?? null,
      created_at: inv.created_at,
      other: profilesById[otherId],
      preview: conversationPreviewText(latest?.body, inv.optional_message),
      lastActivityAt: latest?.created_at ?? inv.created_at,
      lastMessageSenderId: latest?.sender_id ?? null,
    };
  });

  previews.sort(
    (a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
  );

  return options?.limit ? previews.slice(0, options.limit) : previews;
}

export function withUnreadState(
  previews: ConversationPreview[],
  userId: string,
  openInviteId?: string | null
): ConversationPreview[] {
  return previews.map((preview) => ({
    ...preview,
    unread: isConversationUnread(userId, preview, openInviteId),
  }));
}

export function applyInboxMessage(
  previews: ConversationPreview[],
  message: Message,
  userId: string,
  openInviteId?: string | null
): ConversationPreview[] {
  const index = previews.findIndex((p) => p.id === message.invite_id);
  if (index === -1) return previews;

  const current = previews[index];
  const updated: ConversationPreview = {
    ...current,
    preview: message.body.trim() || current.preview,
    lastActivityAt: message.created_at,
    lastMessageSenderId: message.sender_id,
  };

  const next = [...previews];
  next.splice(index, 1);
  next.unshift(updated);

  return withUnreadState(next, userId, openInviteId);
}

export function applyInboxRemove(
  previews: ConversationPreview[],
  inviteId: string
): ConversationPreview[] {
  return previews.filter((preview) => preview.id !== inviteId);
}

export function applyInboxInviteUpdate(
  previews: ConversationPreview[],
  invite: ChatInvite,
  userId: string,
  openInviteId?: string | null
): ConversationPreview[] {
  const index = previews.findIndex((p) => p.id === invite.id);
  if (index === -1) return previews;

  const next = [...previews];
  next[index] = {
    ...next[index],
    conversation_status: invite.conversation_status,
    paused_at: invite.paused_at ?? null,
    paused_by: invite.paused_by ?? null,
    ended_at: invite.ended_at ?? null,
  };

  return withUnreadState(next, userId, openInviteId);
}
