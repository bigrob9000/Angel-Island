"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import type { ChatInvite, Message, Profile } from "@/lib/types";
import { normalizeConversationStatus } from "@/lib/types";
import { usePreferences } from "@/components/PreferencesProvider";
import { isMessagingEnabled } from "@/lib/conversations";
import { UserSafetyActions, type SafetyDialog } from "@/components/UserSafetyActions";

type ModalKind = "pause" | "end" | null;

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

function conversationActionError(message: string): string {
  if (
    message.includes("conversation_status") ||
    message.includes("paused_at") ||
    message.includes("paused_by") ||
    message.includes("ended_at")
  ) {
    return "Pause and end aren't set up yet. Run migration 006_conversation_state.sql in Supabase (see supabase/RUN-PENDING-MIGRATIONS.md).";
  }
  return message;
}

export default function ConversationPage() {
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const { motionReduced } = usePreferences();

  const canMessage = invite ? isMessagingEnabled(invite.conversation_status) : false;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/sign-in");
        return;
      }
      setUserId(user.id);

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
              .select("id, first_name, username")
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
    bottomRef.current?.scrollIntoView({
      behavior: motionReduced ? "auto" : "smooth",
    });
  }, [messages, motionReduced]);

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
    if (inserted) setMessages((prev) => [...prev, inserted as Message]);
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
        setActionError("Only the person who paused can resume this conversation.");
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
        conversationActionError(error?.message ?? "Could not update this conversation.")
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
    setResumeMessage("Conversation resumed.");
    setTimeout(() => setResumeMessage(null), 4000);
  }

  async function handleEnd() {
    await updateConversationStatus("ended");
  }

  if (loading) return <p className="text-muted">Loading…</p>;
  if (!invite) {
    return (
      <div>
        <p className="text-muted">Conversation not found.</p>
        <Link href="/messages" className="mt-4 inline-block text-foreground underline hover:no-underline">
          ← Messages
        </Link>
      </div>
    );
  }

  const otherName = invite.other?.first_name ?? invite.other?.username ?? "Someone";
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
            ← Messages
          </Link>
          <h1 className="font-serif text-xl font-medium text-foreground mt-2">{otherName}</h1>
          {invite.optional_message && (
            <p className="mt-1 text-sm text-muted">
              {userId === invite.sender_id ? "You said" : "They said"}: &ldquo;
              {invite.optional_message}&rdquo;
            </p>
          )}
        </div>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="rounded-md border border-foreground/25 px-3 py-1.5 text-sm text-muted hover:text-foreground"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            ···
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-48 rounded-md border border-foreground/10 bg-white shadow-sm z-10 py-1"
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
                      Resume conversation
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
                    End conversation
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
                    Pause conversation
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
                    End conversation
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
                    Block {otherName}
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
                    Report
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

      {invite.conversation_status === "paused" && (
        <div className="mt-4 rounded-lg border border-foreground/10 bg-white/50 px-4 py-3 text-sm">
          <p className="font-medium text-foreground">This conversation is paused.</p>
          <p className="mt-1 text-muted">
            {userPaused
              ? "Messaging is disabled for both of you. You can resume when you're ready."
              : otherPaused
                ? `${otherName} paused this conversation. They'll resume when they're ready.`
                : "Messaging is disabled for now."}
          </p>
        </div>
      )}

      {invite.conversation_status === "ended" && (
        <div className="mt-4 rounded-lg border border-foreground/10 bg-white/50 px-4 py-3 text-sm">
          <p className="font-medium text-foreground">This conversation is closed.</p>
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

      <div className="mt-4 rounded-lg border border-foreground/10 bg-white/40 p-4 flex-1 overflow-y-auto space-y-4">
        <p className="text-sm text-muted italic">
          This is a private space for conversation. There&apos;s no rush to start.
        </p>
        {messages.length === 0 && canMessage && (
          <p className="text-sm text-muted">Say hello, share a thought, or take your time.</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={msg.sender_id === userId ? "text-right" : ""}>
            <p className="text-sm text-foreground whitespace-pre-wrap inline-block rounded-lg bg-white/60 px-3 py-2 max-w-[85%] text-left">
              {msg.body}
            </p>
            <p className="text-xs text-muted mt-0.5">
              {new Date(msg.created_at).toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>
        ))}
        {pacingCue && (
          <p className="text-sm text-muted italic pt-2">This space is quiet right now.</p>
        )}
        <div ref={bottomRef} />
      </div>

      {canMessage ? (
        <form onSubmit={sendMessage} className="mt-4 shrink-0 flex gap-2">
          <textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder="Say hello, share a thought, or take your time."
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
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50 shrink-0"
          >
            Send
          </button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-muted shrink-0">Messaging is disabled in this conversation.</p>
      )}

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30"
          aria-modal="true"
          role="dialog"
        >
          <div className="bg-ethereal border border-foreground/10 rounded-lg shadow-lg max-w-md w-full p-6">
            {modal === "pause" ? (
              <>
                <h2 className="font-serif text-lg font-medium text-foreground">Pause conversation</h2>
                <p className="mt-3 text-sm text-muted leading-relaxed">
                  Pausing means this conversation won&apos;t be active for now. Messages will be
                  disabled for both of you. Only you can resume when you&apos;re ready.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handlePause}
                    disabled={acting}
                    className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
                  >
                    {acting ? "Pausing…" : "Pause"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="rounded-md border border-foreground/30 px-4 py-2 text-sm text-muted hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="font-serif text-lg font-medium text-foreground">End conversation</h2>
                <p className="mt-3 text-sm text-muted leading-relaxed">
                  Ending will close this conversation permanently. This can&apos;t be undone, and no
                  explanation is required.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleEnd}
                    disabled={acting}
                    className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
                  >
                    {acting ? "Ending…" : "End"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="rounded-md border border-foreground/30 px-4 py-2 text-sm text-muted hover:text-foreground"
                  >
                    Cancel
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
