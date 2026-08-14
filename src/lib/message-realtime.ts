import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";
import type { ChatInvite, Message } from "@/lib/types";

type Handlers = {
  onMessage: (message: Message) => void;
  onInviteUpdate?: (invite: ChatInvite) => void;
};

export function subscribeToConversation(inviteId: string, handlers: Handlers): RealtimeChannel {
  const supabase = createClient();
  const channel = supabase.channel(`conversation:${inviteId}`);

  channel.on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "messages",
      filter: `invite_id=eq.${inviteId}`,
    },
    (payload) => {
      handlers.onMessage(payload.new as Message);
    }
  );

  if (handlers.onInviteUpdate) {
    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "chat_invites",
        filter: `id=eq.${inviteId}`,
      },
      (payload) => {
        handlers.onInviteUpdate!(payload.new as ChatInvite);
      }
    );
  }

  channel.subscribe();
  return channel;
}

export async function unsubscribeFromConversation(channel: RealtimeChannel) {
  const supabase = createClient();
  await supabase.removeChannel(channel);
}

export function subscribeToInbox(handlers: {
  onMessage: (message: Message) => void;
  onInviteUpdate?: (invite: ChatInvite) => void;
}): RealtimeChannel {
  const supabase = createClient();
  const channel = supabase.channel("inbox");

  channel.on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "messages",
    },
    (payload) => {
      handlers.onMessage(payload.new as Message);
    }
  );

  if (handlers.onInviteUpdate) {
    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "chat_invites",
      },
      (payload) => {
        handlers.onInviteUpdate!(payload.new as ChatInvite);
      }
    );
  }

  channel.subscribe();
  return channel;
}

export async function unsubscribeFromInbox(channel: RealtimeChannel) {
  const supabase = createClient();
  await supabase.removeChannel(channel);
}
