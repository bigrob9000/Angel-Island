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
import { markConversationRead } from "@/lib/conversation-reads";
import {
  applyInboxInviteUpdate,
  applyInboxMessage,
  loadConversationPreviews,
  withUnreadState,
  type ConversationPreview,
  conversationPreviewText,
} from "@/lib/conversations";
import { subscribeToInbox, unsubscribeFromInbox } from "@/lib/message-realtime";
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

  const dismissMessageNotice = useCallback(() => {
    setMessageNotice(null);
  }, []);

  const showMessageNotice = useCallback(
    (message: { invite_id: string; sender_id: string; body: string }, previews: ConversationPreview[]) => {
      if (!userId || message.sender_id === userId) return;
      if (openInviteId === message.invite_id) return;

      const conversation = previews.find((p) => p.id === message.invite_id);
      const senderName =
        conversation?.other?.first_name ??
        conversation?.other?.username ??
        "Someone";

      setMessageNotice({
        inviteId: message.invite_id,
        senderName,
        preview: conversationPreviewText(message.body, conversation?.optional_message),
      });
    },
    [userId, openInviteId]
  );

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUserId(null);
      setConversations([]);
      setLoading(false);
      return;
    }

    setUserId(user.id);
    const previews = await loadConversationPreviews(user.id);
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
