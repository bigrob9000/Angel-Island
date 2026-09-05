"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { CollaborationMessage, Profile } from "@/lib/types";
import { PROFILE_ATTRIBUTION_FIELDS } from "@/lib/profile";
import { normalizeProfile } from "@/lib/types";
import { sendCollaborationMessage } from "@/lib/group-collaborations";

type Props = {
  collaborationId: string;
  userId: string;
  initialMessages: CollaborationMessage[];
  disabled?: boolean;
};

export function GroupCollabChat({
  collaborationId,
  userId,
  initialMessages,
  disabled = false,
}: Props) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profilesById, setProfilesById] = useState<Record<string, Profile>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    const ids = [...new Set(messages.map((m) => m.sender_id))];
    if (ids.length === 0) return;
    const supabase = createClient();
    supabase
      .from("profiles")
      .select(PROFILE_ATTRIBUTION_FIELDS)
      .in("id", ids)
      .then(({ data }) => {
        const map: Record<string, Profile> = {};
        (data ?? []).forEach((row) => {
          map[row.id] = normalizeProfile(row as Profile);
        });
        setProfilesById(map);
      });
  }, [messages]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`collab-chat:${collaborationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "collaboration_messages",
          filter: `collaboration_id=eq.${collaborationId}`,
        },
        (payload) => {
          const msg = payload.new as CollaborationMessage;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [collaborationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;
    setSending(true);
    setError(null);
    const result = await sendCollaborationMessage(collaborationId, body);
    setSending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.message) {
      setMessages((prev) =>
        prev.some((m) => m.id === result.message!.id) ? prev : [...prev, result.message!],
      );
    }
    setBody("");
  }

  return (
    <div className="space-y-4">
      <div className="surface max-h-80 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted italic">No group messages yet — say hello when you&apos;re ready.</p>
        ) : (
          messages.map((msg) => {
            const name =
              profilesById[msg.sender_id]?.first_name ??
              profilesById[msg.sender_id]?.username ??
              (msg.sender_id === userId ? "You" : "Someone");
            const isMine = msg.sender_id === userId;
            return (
              <div key={msg.id} className={`text-sm ${isMine ? "text-right" : ""}`}>
                <p className="text-xs text-muted">{isMine ? "You" : name}</p>
                <p
                  className={`mt-0.5 inline-block rounded-lg px-3 py-2 ${
                    isMine ? "bg-foreground text-background" : "bg-white/70 text-foreground"
                  }`}
                >
                  {msg.body}
                </p>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {disabled ? (
        <p className="text-sm text-muted">Group chat is paused while this collaboration is on hold.</p>
      ) : (
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="flex-1 rounded-md border border-foreground/20 bg-white px-3 py-2 text-sm text-foreground"
            placeholder="Message the group…"
            maxLength={2000}
          />
          <button type="submit" disabled={sending || !body.trim()} className="btn-primary btn-sm shrink-0">
            Send
          </button>
        </form>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
