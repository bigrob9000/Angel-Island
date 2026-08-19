"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CollaborationPreviewLink } from "@/components/CollaborationPreviewLink";
import { ConversationPreviewLink } from "@/components/ConversationPreviewLink";
import { EmptyState } from "@/components/EmptyState";
import { PageLoading } from "@/components/PageLoading";
import { useCollab } from "@/components/CollabProvider";
import { useInbox } from "@/components/InboxProvider";

export default function NotificationsPage() {
  const {
    conversations,
    loading: inboxLoading,
    unreadCount: messageUnread,
    markRead: markConversationRead,
  } = useInbox();
  const {
    collaborations,
    loading: collabLoading,
    unreadCount: collabUnread,
    markRead: markCollabRead,
  } = useCollab();

  const unreadConversations = useMemo(
    () => conversations.filter((conversation) => conversation.unread),
    [conversations],
  );
  const unreadCollaborations = useMemo(
    () => collaborations.filter((collaboration) => collaboration.unread),
    [collaborations],
  );

  const totalUnread = messageUnread + collabUnread;
  const loading = inboxLoading || collabLoading;

  function markAllRead() {
    unreadConversations.forEach((conversation) => markConversationRead(conversation.id));
    unreadCollaborations.forEach((collaboration) => markCollabRead(collaboration.id));
  }

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-medium text-foreground">Activity</h1>
          <p className="mt-2 text-sm text-muted">
            Unread messages and collaboration updates in one place.
          </p>
        </div>
        {totalUnread > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
          >
            Mark all read
          </button>
        )}
      </div>

      {totalUnread === 0 ? (
        <EmptyState
          title="You're all caught up."
          description="New messages and collab activity will show up here."
        >
          <Link
            href="/messages"
            className="rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
          >
            Messages
          </Link>
          <Link
            href="/collaborations"
            className="rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
          >
            Collaborations
          </Link>
        </EmptyState>
      ) : (
        <>
          {unreadConversations.length > 0 && (
            <section>
              <h2 className="font-serif text-lg font-medium text-foreground">Messages</h2>
              <ul className="mt-4 space-y-2">
                {unreadConversations.map((conversation) => (
                  <li key={conversation.id}>
                    <ConversationPreviewLink conversation={conversation} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {unreadCollaborations.length > 0 && (
            <section>
              <h2 className="font-serif text-lg font-medium text-foreground">Collaborations</h2>
              <ul className="mt-4 space-y-2">
                {unreadCollaborations.map((collaboration) => (
                  <li key={collaboration.id}>
                    <CollaborationPreviewLink preview={collaboration} unread />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
