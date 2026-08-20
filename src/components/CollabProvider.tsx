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
import {
  collabActivityLabel,
  collabActivityPreview,
  ensureCollaborationReadsLoaded,
  isCollaborationUnread,
  markCollaborationRead,
  resetCollaborationReadsCache,
} from "@/lib/collaboration-reads";
import {
  subscribeToCollabInbox,
  unsubscribeFromCollabInbox,
} from "@/lib/collaboration-realtime";
import { loadCollaborationPreviews, type CollaborationPreview } from "@/lib/collaborations";
import type { CollaborationEntry } from "@/lib/types";

export type CollabNotice = {
  collaborationId: string;
  authorName: string;
  activityLabel: string;
  preview: string;
};

type CollabContextValue = {
  userId: string | null;
  collaborations: CollaborationPreview[];
  loading: boolean;
  unreadCount: number;
  collabNotice: CollabNotice | null;
  dismissCollabNotice: () => void;
  refresh: () => Promise<void>;
  markRead: (collaborationId: string, at?: string) => void;
};

const CollabContext = createContext<CollabContextValue | null>(null);

function openCollabIdFromPath(pathname: string | null): string | null {
  if (!pathname?.startsWith("/collaborations/")) return null;
  const id = pathname.slice("/collaborations/".length);
  return id || null;
}

function withUnreadState(
  previews: CollaborationPreview[],
  userId: string,
  openCollaborationId?: string | null,
): CollaborationPreview[] {
  return previews.map((preview) => ({
    ...preview,
    unread: isCollaborationUnread(userId, preview, openCollaborationId),
  }));
}

type PreviewWithUnread = CollaborationPreview & { unread?: boolean };

export function CollabProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const openCollaborationId = openCollabIdFromPath(pathname);
  const [userId, setUserId] = useState<string | null>(null);
  const [collaborations, setCollaborations] = useState<PreviewWithUnread[]>([]);
  const [loading, setLoading] = useState(true);
  const [collabNotice, setCollabNotice] = useState<CollabNotice | null>(null);

  const dismissCollabNotice = useCallback(() => {
    setCollabNotice(null);
  }, []);

  const showCollabNotice = useCallback(
    (entry: CollaborationEntry, previews: PreviewWithUnread[]) => {
      if (!userId || entry.author_id === userId) return;
      if (openCollaborationId === entry.collaboration_id) return;

      const preview = previews.find((item) => item.id === entry.collaboration_id);
      const authorName =
        preview?.other?.first_name ?? preview?.other?.username ?? "Your collaborator";

      setCollabNotice({
        collaborationId: entry.collaboration_id,
        authorName,
        activityLabel: collabActivityLabel(entry.entry_type),
        preview: collabActivityPreview(entry.entry_type, entry.body, entry.url),
      });
    },
    [userId, openCollaborationId],
  );

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUserId(null);
      setCollaborations([]);
      resetCollaborationReadsCache();
      setLoading(false);
      return;
    }

    setUserId(user.id);
    const [result] = await Promise.all([
      loadCollaborationPreviews(user.id, "active"),
      ensureCollaborationReadsLoaded(user.id),
    ]);
    setCollaborations(withUnreadState(result.previews, user.id, openCollaborationId));
    setLoading(false);
  }, [openCollaborationId]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;
    setCollaborations((prev) => withUnreadState(prev, userId, openCollaborationId));
  }, [openCollaborationId, userId]);

  useEffect(() => {
    if (!userId) return;

    const channel = subscribeToCollabInbox({
      onEntryInsert: (entry) => {
        setCollaborations((prev) => {
          const index = prev.findIndex((item) => item.id === entry.collaboration_id);
          if (index === -1) {
            void refresh();
            return prev;
          }

          const current = prev[index];
          const activityAt = entry.updated_at ?? entry.created_at;
          const updated: PreviewWithUnread = {
            ...current,
            lastActivityAt: activityAt,
            lastEntryAuthorId: entry.author_id,
          };

          const next = [...prev];
          next.splice(index, 1);
          next.unshift(updated);
          const withUnread = withUnreadState(next, userId, openCollaborationId);

          if (openCollaborationId !== entry.collaboration_id) {
            showCollabNotice(entry, withUnread);
          }
          if (openCollaborationId === entry.collaboration_id) {
            markCollaborationRead(userId, entry.collaboration_id, activityAt);
            return withUnreadState(withUnread, userId, openCollaborationId);
          }

          return withUnread;
        });
      },
    });

    return () => {
      void unsubscribeFromCollabInbox(channel);
    };
  }, [userId, openCollaborationId, refresh, showCollabNotice]);

  const markRead = useCallback(
    (collaborationId: string, at?: string) => {
      if (!userId) return;
      markCollaborationRead(userId, collaborationId, at);
      setCollaborations((prev) => withUnreadState(prev, userId, collaborationId));
    },
    [userId],
  );

  const unreadCount = useMemo(
    () => collaborations.filter((collaboration) => collaboration.unread).length,
    [collaborations],
  );

  const value = useMemo(
    () => ({
      userId,
      collaborations,
      loading,
      unreadCount,
      collabNotice,
      dismissCollabNotice,
      refresh,
      markRead,
    }),
    [
      userId,
      collaborations,
      loading,
      unreadCount,
      collabNotice,
      dismissCollabNotice,
      refresh,
      markRead,
    ],
  );

  return <CollabContext.Provider value={value}>{children}</CollabContext.Provider>;
}

export function useCollab() {
  const context = useContext(CollabContext);
  if (!context) {
    throw new Error("useCollab must be used within CollabProvider");
  }
  return context;
}
