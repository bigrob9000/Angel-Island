import { createClient } from "@/lib/supabase";
import { normalizeConversationStatus } from "@/lib/types";

export async function loadArchivedInviteIds(userId: string): Promise<Set<string>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("conversation_archive")
    .select("invite_id")
    .eq("user_id", userId);

  if (error) {
    if (error.message.includes("conversation_archive")) return new Set();
    console.warn("Could not load archived conversations:", error.message);
    return new Set();
  }

  return new Set((data ?? []).map((row) => row.invite_id as string));
}

export async function hideConversationFromList(
  userId: string,
  inviteId: string
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("conversation_archive").insert({
    user_id: userId,
    invite_id: inviteId,
  });

  if (error) {
    if (error.code === "23505") return { error: null };
    if (error.message.includes("conversation_archive")) {
      return {
        error:
          "Remove from list isn't set up yet. Run migration 025_conversation_archive.sql in Supabase (see supabase/RUN-PENDING-MIGRATIONS.md).",
      };
    }
    return { error: error.message };
  }

  return { error: null };
}

export async function restoreConversationToList(
  userId: string,
  inviteId: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("conversation_archive")
    .delete()
    .eq("user_id", userId)
    .eq("invite_id", inviteId);

  if (error) {
    if (error.message.includes("conversation_archive")) {
      return {
        error:
          "Restore isn't set up yet. Run migration 025_conversation_archive.sql in Supabase (see supabase/RUN-PENDING-MIGRATIONS.md).",
      };
    }
    return { error: error.message };
  }

  return { error: null };
}

export async function permanentlyDeleteConversation(
  userId: string,
  inviteId: string
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { data: invite, error: fetchError } = await supabase
    .from("chat_invites")
    .select("id, sender_id, receiver_id, status, conversation_status")
    .eq("id", inviteId)
    .maybeSingle();

  if (fetchError || !invite) {
    return { error: "Conversation not found." };
  }

  if (invite.status !== "accepted") {
    return { error: "Only accepted conversations can be deleted." };
  }

  if (normalizeConversationStatus(invite.conversation_status) !== "ended") {
    return { error: "End the conversation before deleting it permanently." };
  }

  const isParticipant = invite.sender_id === userId || invite.receiver_id === userId;
  if (!isParticipant) {
    return { error: "You don't have access to this conversation." };
  }

  const { error } = await supabase.from("chat_invites").delete().eq("id", inviteId);

  if (error) {
    if (error.message.includes("policy") || error.code === "42501") {
      return {
        error:
          "Permanent delete isn't set up yet. Run migration 026_conversation_delete.sql in Supabase (see supabase/RUN-PENDING-MIGRATIONS.md).",
      };
    }
    return { error: error.message };
  }

  return { error: null };
}
