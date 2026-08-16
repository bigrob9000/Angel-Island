import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";
import type { Collaboration, CollaborationEntry } from "@/lib/types";

type Handlers = {
  onEntryInsert?: (entry: CollaborationEntry) => void;
  onEntryUpdate?: (entry: CollaborationEntry) => void;
  onEntryDelete?: (entry: CollaborationEntry) => void;
  onCollaborationUpdate?: (collaboration: Collaboration) => void;
};

export function subscribeToCollaboration(
  collaborationId: string,
  handlers: Handlers,
): RealtimeChannel {
  const supabase = createClient();
  const channel = supabase.channel(`collaboration:${collaborationId}`);

  if (handlers.onEntryInsert) {
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "collaboration_entries",
        filter: `collaboration_id=eq.${collaborationId}`,
      },
      (payload) => {
        handlers.onEntryInsert!(payload.new as CollaborationEntry);
      },
    );
  }

  if (handlers.onEntryUpdate) {
    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "collaboration_entries",
        filter: `collaboration_id=eq.${collaborationId}`,
      },
      (payload) => {
        handlers.onEntryUpdate!(payload.new as CollaborationEntry);
      },
    );
  }

  if (handlers.onEntryDelete) {
    channel.on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "collaboration_entries",
        filter: `collaboration_id=eq.${collaborationId}`,
      },
      (payload) => {
        handlers.onEntryDelete!(payload.old as CollaborationEntry);
      },
    );
  }

  if (handlers.onCollaborationUpdate) {
    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "collaborations",
        filter: `id=eq.${collaborationId}`,
      },
      (payload) => {
        handlers.onCollaborationUpdate!(payload.new as Collaboration);
      },
    );
  }

  channel.subscribe();
  return channel;
}

export async function unsubscribeFromCollaboration(channel: RealtimeChannel) {
  const supabase = createClient();
  await supabase.removeChannel(channel);
}
