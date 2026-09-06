"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { notifyNewMessage } from "@/lib/notifications/client";
import { createClient } from "@/lib/supabase";
import type { ChatInvite, Message, Profile } from "@/lib/types";
import { normalizeConversationStatus } from "@/lib/types";
import { usePreferences } from "@/components/PreferencesProvider";
import { hideConversationFromList, loadArchivedInviteIds, permanentlyDeleteConversation, restoreConversationToList } from "@/lib/conversation-archive";
import { isMessagingEnabled } from "@/lib/conversations";
import { UserSafetyActions, type SafetyDialog } from "@/components/UserSafetyActions";
import { PROFILE_ATTRIBUTION_FIELDS } from "@/lib/profile";
import { subscribeToConversation, unsubscribeFromConversation } from "@/lib/message-realtime";
import { useInbox } from "@/components/InboxProvider";
import { NotFoundPanel } from "@/components/NotFoundPanel";
import { PageLoading } from "@/components/PageLoading";
import type { TranslateFn } from "@/lib/i18n/labels";

type ModalKind = "pause" | "end" | "remove" | "delete" | null;

function conversationActionError(message: string, t: TranslateFn): string {
  if (
    message.includes("conversation_status") ||
    message.includes("paused_at") ||
    message.includes("paused_by") ||
    message.includes("ended_at")
  ) {
    return t("errors.pauseEndNotSetup");
  }
  return message;
}

function normalizeInvite(row: ChatInvite): ChatInvite {
  return {
    ...row,
    conversation_status: normalizeConversationStatus(row.conversation_status),
    paused_at: row.paused_at ?? null,
    paused_by: row.paused_by ?? null,
    ended_at: row.ended_at ?? null,
  };
}

function canResumeConversation(invite: ChatInvite, userId: string | null): boolean {
  if (!userId || invite.conversation_status !== "paused") return false;
  if (!invite.paused_by) return true;
  return invite.paused_by === userId;
}

function showPacingCue(messages: Message[], userId: string | null): boolean {
  if (!userId || messages.length < 3) return false;
  const lastThree = messages.slice(-3);
  const allFromOther = lastThree.every((m) => m.sender_id !== userId);
  return allFromOther;
}

export default function ConversationPage() {
  const t = useTranslations("messages");
  const tc = useTranslations("common");
  const params = useParams();
  const router = useRouter();
  const inviteId = params.id as string;
  const [invite, setInvite] = useState<(ChatInvite & { other?: Profile }) | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [newBody, setNewBody] = useState("");
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [safetyDialog, setSafetyDialog] = useState<SafetyDialog>(null);
  const [modal, setModal] = useState<ModalKind>(null);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [resumeMessage, setResumeMessage] = useState<string | null>(null);
  const [isArchived, setIsArchived] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { motionReduced } = usePreferences();
  const { markRead, refresh } = useInbox();

  const canMessage = invite ? isMessagingEnabled(invite.conversation_status) : false;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/sign-in");
        return;
      }
      setUserId(user.id);

      void loadArchivedInviteIds(user.id).then((ids) => {
        setIsArchived(ids.has(inviteId));
      });

      void Promise.resolve(
        supabase
          .from("chat_invites")
          .select("*")
          .eq("id", inviteId)
          .eq("status", "accepted")
          .single()
          .then((invRes) => {
            if (invRes.error || !invRes.data) {
              setInvite(null);
              return;
            }
            const inv = normalizeInvite(invRes.data as ChatInvite);
            const otherId = inv.sender_id === user.id ? inv.receiver_id : inv.sender_id;
            supabase
              .from("profiles")
              .select(PROFILE_ATTRIBUTION_FIELDS)
              .eq("id", otherId)
              .single()
              .then((pRes) => {
                setInvite({ ...inv, other: pRes.data as Profile });
              });

            supabase
              .from("messages")
              .select("*")
              .eq("invite_id", inviteId)
              .order("created_at", { ascending: true })
              .then((msgRes) => setMessages((msgRes.data ?? []) as Message[]));
          })
      ).finally(() => setLoading(false));
    });
  }, [inviteId, router]);

  useEffect(() => {
    if (!inviteId || !userId) return;

    const channel = subscribeToConversation(inviteId, {
      onMessage: (message) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      },
      onInviteUpdate: (row) => {
        const updated = normalizeInvite(row);
        setInvite((prev) => (prev ? { ...prev, ...updated } : prev));
      },
    });

    return () => {
      void unsubscribeFromConversation(channel);
    };
  }, [inviteId, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: motionReduced ? "auto" : "smooth",
    });
  }, [messages, motionReduced]);

  useEffect(() => {
    if (!inviteId || loading) return;
    const latest = messages[messages.length - 1];
    markRead(inviteId, latest?.created_at ?? new Date().toISOString());
  }, [inviteId, loading, messages, markRead]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !newBody.trim() || !canMessage) return;
    const supabase = createClient();
    setSending(true);
    const body = newBody.trim();
    setNewBody("");

    const { data: inserted, error } = await supabase
      .from("messages")
      .insert({ invite_id: inviteId, sender_id: userId, body })
      .select("id, invite_id, sender_id, body, created_at")
      .single();

    setSending(false);
    if (error) {
      setActionError(error.message);
      setNewBody(body);
      return;
    }
    setActionError(null);
    if (inserted) {
      setMessages((prev) => [...prev, inserted as Message]);
      notifyNewMessage(inserted.id);
    }
  }

  async function updateConversationStatus(
    conversation_status: ChatInvite["conversation_status"],
    extra: Partial<ChatInvite> = {}
  ) {
    if (!userId || !invite) return;
    const supabase = createClient();
    setActing(true);

    const patch: Record<string, unknown> = {
      conversation_status,
      ...extra,
    };
    if (conversation_status === "paused") {
      patch.paused_at = new Date().toISOString();
      patch.paused_by = userId;
      patch.ended_at = null;
    }
    if (conversation_status === "active") {
      if (!canResumeConversation(invite, userId)) {
        setActing(false);
        setActionError(t("errors.onlyPauserCanResume"));
        return;
      }
      patch.paused_at = null;
      patch.paused_by = null;
    }
    if (conversation_status === "ended") {
      patch.ended_at = new Date().toISOString();
      patch.paused_by = null;
    }

    const { data, error } = await supabase
      .from("chat_invites")
      .update(patch)
      .eq("id", inviteId)
      .select("*")
      .single();

    setActing(false);
    setModal(null);
    setMenuOpen(false);

    if (error || !data) {
      setActionError(
        conversationActionError(error?.message ?? t("errors.couldNotUpdate"), t)
      );
      return;
    }

    setActionError(null);
    setInvite((prev) =>
      prev ? { ...prev, ...normalizeInvite(data as ChatInvite) } : prev
    );
  }

  async function handlePause() {
    await updateConversationStatus("paused");
  }

  async function handleResume() {
    await updateConversationStatus("active");
    setResumeMessage(t("conversationResumed"));
    setTimeout(() => setResumeMessage(null), 4000);
  }

  async function handleEnd() {
    await updateConversationStatus("ended");
  }

  async function handleRemoveFromList() {
    if (!userId) return;
    setActing(true);
    const { error } = await hideConversationFromList(userId, inviteId);
    setActing(false);
    setModal(null);
    setMenuOpen(false);

    if (error) {
      setActionError(error);
      return;
    }

    setActionError(null);
    setIsArchived(true);
    await refresh();
    router.push("/messages");
  }

  async function handleRestoreToList() {
    if (!userId) return;
    setActing(true);
    const { error } = await restoreConversationToList(userId, inviteId);
    setActing(false);
    setMenuOpen(false);

    if (error) {
      setActionError(error);
      return;
    }

    setActionError(null);
    setIsArchived(false);
    await refresh();
  }

  async function handleDeletePermanently() {
    if (!userId) return;
    setActing(true);
    const { error } = await permanentlyDeleteConversation(userId, inviteId);
    setActing(false);
    setModal(null);
    setMenuOpen(false);

    if (error) {
      setActionError(error);
      return;
    }

    setActionError(null);
    await refresh();
    router.push("/messages");
  }

  if (loading) return <PageLoading />;
  if (!invite) {
    return (
      <NotFoundPanel
        title={t("notFound")}
        description={t("notFoundDescription")}
        backHref="/messages"
        backLabel={t("backToMessages")}
      />
    );
  }

  const otherName = invite.other?.first_name ?? invite.other?.username ?? t("someone");
  const otherId = invite.sender_id === userId ? invite.receiver_id : invite.sender_id;
  const pacingCue = canMessage && showPacingCue(messages, userId);
  const userPaused = invite.conversation_status === "paused" && invite.paused_by === userId;
  const otherPaused =
    invite.conversation_status === "paused" &&
    invite.paused_by != null &&
    invite.paused_by !== userId;
  const canResume = canResumeConversation(invite, userId);

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      <div className="shrink-0 flex items-start justify-between gap-4">
        <div>
          <Link href="/messages" className="text-sm text-muted hover:text-foreground">
            {t("backToMessages")}
          </Link>
          <h1 className="font-serif text-xl font-medium text-foreground mt-2">{otherName}</h1>
          {invite.optional_message && (
            <p className="mt-1 text-sm text-muted">
              {userId === invite.sender_id ? t("youSaid") : t("theySaid")}: &ldquo;
              {invite.optional_message}&rdquo;
            </p>
          )}
        </div>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="btn-secondary btn-sm"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            ···
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="surface absolute right-0 mt-2 w-48 z-10 py-1 shadow-lg"
            >
              {invite.conversation_status === "paused" ? (
                <>
                  {canResume && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleResume}
                      disabled={acting}
                      className="block w-full px-4 py-2 text-left text-sm text-foreground hover:bg-foreground/5 disabled:opacity-50"
                    >
                      {t("resumeConversation")}
                    </button>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setModal("end");
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-foreground hover:bg-foreground/5"
                  >
                    {t("endConversation")}
                  </button>
                </>
              ) : invite.conversation_status === "active" ? (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setModal("pause");
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-foreground hover:bg-foreground/5"
                  >
                    {t("pauseConversation")}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setModal("end");
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-foreground hover:bg-foreground/5"
                  >
                    {t("endConversation")}
                  </button>
                </>
              ) : invite.conversation_status === "ended" ? (
                <>
                  <button
                    type="button"
                    role="menuitem"
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
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setModal("delete");
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                  >
                    {t("deletePermanently")}
                  </button>
                </>
              ) : null}
              {userId && otherId && (
                <>
                  <div className="my-1 border-t border-foreground/10" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setSafetyDialog("block");
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-foreground/5"
                  >
                    {t("blockUser", { name: otherName })}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setSafetyDialog("report");
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-foreground/5"
                  >
                    {tc("report")}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {userId && otherId && (
        <UserSafetyActions
          currentUserId={userId}
          reportedUserId={otherId}
          reportedUserName={otherName}
          targetType="conversation"
          targetId={inviteId}
          showTriggers={false}
          dialog={safetyDialog}
          onDialogChange={setSafetyDialog}
          onBlocked={() => router.push("/messages")}
        />
      )}

      {isArchived && (
        <div className="mt-4 surface px-4 py-3 text-sm">
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

      {invite.conversation_status === "paused" && (
        <div className="mt-4 surface px-4 py-3 text-sm">
          <p className="font-medium text-foreground">{t("pausedTitle")}</p>
          <p className="mt-1 text-muted">
            {userPaused
              ? t("pausedByYou")
              : otherPaused
                ? t("pausedByOther", { name: otherName })
                : t("pausedGeneric")}
          </p>
        </div>
      )}

      {invite.conversation_status === "ended" && (
        <div className="mt-4 surface px-4 py-3 text-sm">
          <p className="font-medium text-foreground">{t("closedTitle")}</p>
          <p className="mt-1 text-muted">{t("closedCopy")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setModal("remove")}
              disabled={acting}
              className="btn-secondary"
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
        </div>
      )}

      {resumeMessage && (
        <p className="mt-3 text-sm text-muted" role="status">
          {resumeMessage}
        </p>
      )}

      {actionError && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {actionError}
        </p>
      )}

      <div className="mt-4 surface p-4 flex-1 overflow-y-auto space-y-4">
        <p className="text-sm text-muted italic">{t("privateSpaceCue")}</p>
        {messages.length === 0 && canMessage && (
          <p className="text-sm text-muted">{t("sayHello")}</p>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === userId;
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
            >
              <p
                className={`text-sm whitespace-pre-wrap inline-block rounded-2xl px-3 py-2 max-w-[85%] text-left ${
                  isMine
                    ? "bg-accent text-[#faf8f5]"
                    : "border border-foreground/10 bg-white/60 text-foreground"
                }`}
              >
                {msg.body}
              </p>
              <p className="text-xs text-muted mt-0.5">
                {new Date(msg.created_at).toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
          );
        })}
        {pacingCue && (
          <p className="text-sm text-muted italic pt-2">{t("quietSpaceCue")}</p>
        )}
        <div ref={bottomRef} />
      </div>

      {canMessage ? (
        <form onSubmit={sendMessage} className="mt-4 shrink-0 flex gap-2">
          <textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder={t("sayHello")}
            rows={1}
            className="flex-1 rounded-md border border-foreground/20 bg-white px-3 py-2 text-foreground placeholder:text-muted focus:border-foreground/40 focus:outline-none resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={sending || !newBody.trim()}
            className="btn-primary shrink-0"
          >
            {tc("send")}
          </button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-muted shrink-0">{t("messagingDisabled")}</p>
      )}

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30"
          aria-modal="true"
          role="dialog"
        >
          <div className="surface max-w-md w-full p-6 shadow-lg">
            {modal === "pause" ? (
              <>
                <h2 className="section-heading">{t("pauseTitle")}</h2>
                <p className="mt-3 text-sm text-muted leading-relaxed">{t("pauseCopy")}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handlePause}
                    disabled={acting}
                    className="btn-primary"
                  >
                    {acting ? t("pausing") : tc("pause")}
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
                <p className="mt-3 text-sm text-muted leading-relaxed">{t("endCopy")}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleEnd}
                    disabled={acting}
                    className="btn-primary"
                  >
                    {acting ? t("ending") : tc("end")}
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
