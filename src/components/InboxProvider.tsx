"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { ensureConversationReadsLoaded, markConversationRead, resetConversationReadsCache } from "@/lib/conversation-reads";
import {
  applyInboxInviteUpdate,
  applyInboxMessage,
  loadConversationPreviews,
  withUnreadState,
  type ConversationPreview,
  conversationPreviewText,
} from "@/lib/conversations";
import { subscribeToInbox, unsubscribeFromInbox } from "@/lib/message-realtime";
import { showBrowserNotification } from "@/lib/push/client";
import type { ChatInvite } from "@/lib/types";
import { normalizeConversationStatus } from "@/lib/types";

export type MessageNotice = {
  inviteId: string;
  senderName: string;
  preview: string;
};

type InboxContextValue = {
  userId: string | null;
  conversations: ConversationPreview[];
  loading: boolean;
  unreadCount: number;
  messageNotice: MessageNotice | null;
  dismissMessageNotice: () => void;
  refresh: () => Promise<void>;
  markRead: (inviteId: string, at?: string) => void;
};

const InboxContext = createContext<InboxContextValue | null>(null);

function openInviteIdFromPath(pathname: string | null): string | null {
  if (!pathname?.startsWith("/messages/")) return null;
  const id = pathname.slice("/messages/".length);
  return id || null;
}

export function InboxProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const openInviteId = openInviteIdFromPath(pathname);
  const [userId, setUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageNotice, setMessageNotice] = useState<MessageNotice | null>(null);
  const [notifyPushMessages, setNotifyPushMessages] = useState(false);

  const dismissMessageNotice = useCallback(() => {
    setMessageNotice(null);
  }, []);

  const showMessageNotice = useCallback(
    (
      message: { id: string; invite_id: string; sender_id: string; body: string },
      previews: ConversationPreview[],
    ) => {
      if (!userId || message.sender_id === userId) return;
      if (openInviteId === message.invite_id) return;

      const conversation = previews.find((p) => p.id === message.invite_id);
      const senderName =
        conversation?.other?.first_name ??
        conversation?.other?.username ??
        "Someone";
      const preview = conversationPreviewText(message.body, conversation?.optional_message);

      setMessageNotice({
        inviteId: message.invite_id,
        senderName,
        preview,
      });

      if (notifyPushMessages) {
        void showBrowserNotification({
          title: `${senderName} sent you a message`,
          body: preview,
          url: `/messages/${message.invite_id}`,
          tag: `message-${message.id}`,
        });
      }
    },
    [userId, openInviteId, notifyPushMessages]
  );

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUserId(null);
      setConversations([]);
      resetConversationReadsCache();
      setLoading(false);
      return;
    }

    setUserId(user.id);
    const [previews, , profileRes] = await Promise.all([
      loadConversationPreviews(user.id),
      ensureConversationReadsLoaded(user.id),
      supabase.from("profiles").select("notify_push_messages").eq("id", user.id).maybeSingle(),
    ]);
    setNotifyPushMessages(profileRes.data?.notify_push_messages === true);
    setConversations(withUnreadState(previews, user.id, openInviteId));
    setLoading(false);
  }, [openInviteId]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;
    setConversations((prev) => withUnreadState(prev, userId, openInviteId));
  }, [openInviteId, userId]);

  useEffect(() => {
    if (!userId) return;

    async function reloadPushPreference() {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("notify_push_messages")
        .eq("id", userId)
        .maybeSingle();
      setNotifyPushMessages(data?.notify_push_messages === true);
    }

    window.addEventListener("focus", reloadPushPreference);
    return () => window.removeEventListener("focus", reloadPushPreference);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const channel = subscribeToInbox({
      onMessage: (message) => {
        setConversations((prev) => {
          if (!prev.some((conversation) => conversation.id === message.invite_id)) {
            void refresh();
            return prev;
          }
          const next = applyInboxMessage(prev, message, userId, openInviteId);
          if (openInviteId !== message.invite_id) {
            showMessageNotice(message, next);
          }
          if (openInviteId === message.invite_id) {
            markConversationRead(userId, message.invite_id, message.created_at);
            return withUnreadState(next, userId, openInviteId);
          }
          return next;
        });
      },
      onInviteUpdate: (row) => {
        const invite: ChatInvite = {
          ...(row as ChatInvite),
          conversation_status: normalizeConversationStatus(row.conversation_status),
          paused_at: row.paused_at ?? null,
          paused_by: row.paused_by ?? null,
          ended_at: row.ended_at ?? null,
        };
        setConversations((prev) => applyInboxInviteUpdate(prev, invite, userId, openInviteId));
      },
    });

    return () => {
      void unsubscribeFromInbox(channel);
    };
  }, [userId, openInviteId, refresh, showMessageNotice]);

  const markRead = useCallback(
    (inviteId: string, at?: string) => {
      if (!userId) return;
      markConversationRead(userId, inviteId, at);
      setConversations((prev) => withUnreadState(prev, userId, inviteId));
    },
    [userId]
  );

  const unreadCount = useMemo(
    () => conversations.filter((conversation) => conversation.unread).length,
    [conversations]
  );

  const value = useMemo(
    () => ({
      userId,
      conversations,
      loading,
      unreadCount,
      messageNotice,
      dismissMessageNotice,
      refresh,
      markRead,
    }),
    [userId, conversations, loading, unreadCount, messageNotice, dismissMessageNotice, refresh, markRead]
  );

  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
}

export function useInbox() {
  const context = useContext(InboxContext);
  if (!context) {
    throw new Error("useInbox must be used within InboxProvider");
  }
  return context;
}
