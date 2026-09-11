import { createClient } from "@/lib/supabase";

export async function loadArchivedCollaborationIds(userId: string): Promise<Set<string>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("collaboration_archive")
    .select("collaboration_id")
    .eq("user_id", userId);

  if (error) {
    if (error.message.includes("collaboration_archive")) return new Set();
    console.warn("Could not load archived collaborations:", error.message);
    return new Set();
  }

  return new Set((data ?? []).map((row) => row.collaboration_id as string));
}

export async function hideCollaborationFromList(
  userId: string,
  collaborationId: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("collaboration_archive").insert({
    user_id: userId,
    collaboration_id: collaborationId,
  });

  if (error) {
    if (error.code === "23505") return { error: null };
    if (
      error.message.includes("collaboration_archive") ||
      error.code === "42501" ||
      error.message.includes("permission denied")
    ) {
      return {
        error:
          "Remove from list isn't set up yet. Run migrations 039 and 040 in Supabase (see supabase/RUN-PENDING-MIGRATIONS.md).",
      };
    }
    if (error.message.includes("row-level security")) {
      return { error: "Only closed collaborations can be removed from your list." };
    }
    return { error: error.message };
  }

  return { error: null };
}

export async function restoreCollaborationToList(
  userId: string,
  collaborationId: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("collaboration_archive")
    .delete()
    .eq("user_id", userId)
    .eq("collaboration_id", collaborationId);

  if (error) {
    if (error.message.includes("collaboration_archive")) {
      return {
        error:
          "Restore isn't set up yet. Run migration 039_collaboration_archive.sql in Supabase (see supabase/RUN-PENDING-MIGRATIONS.md).",
      };
    }
    return { error: error.message };
  }

  return { error: null };
}

async function isCollaborationParticipant(
  userId: string,
  collaborationId: string,
  collabInviteId: string | null,
): Promise<boolean> {
  const supabase = createClient();

  const { data: membership } = await supabase
    .from("collaboration_members")
    .select("user_id")
    .eq("collaboration_id", collaborationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (membership) return true;

  if (!collabInviteId) return false;

  const { data: invite } = await supabase
    .from("collab_invites")
    .select("sender_id, receiver_id")
    .eq("id", collabInviteId)
    .maybeSingle();

  if (!invite) return false;
  return invite.sender_id === userId || invite.receiver_id === userId;
}

export async function permanentlyDeleteCollaboration(
  userId: string,
  collaborationId: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { data: collab, error: fetchError } = await supabase
    .from("collaborations")
    .select("id, status, collab_invite_id")
    .eq("id", collaborationId)
    .maybeSingle();

  if (fetchError || !collab) {
    return { error: "Collaboration not found." };
  }

  if (collab.status !== "ended") {
    return { error: "End the collaboration before deleting it permanently." };
  }

  const isParticipant = await isCollaborationParticipant(
    userId,
    collaborationId,
    collab.collab_invite_id,
  );
  if (!isParticipant) {
    return { error: "You don't have access to this collaboration." };
  }

  const { error } = await supabase.from("collaborations").delete().eq("id", collaborationId);

  if (error) {
    if (
      error.message.includes("policy") ||
      error.code === "42501" ||
      error.message.includes("permission denied")
    ) {
      return {
        error:
          "Permanent delete isn't set up yet. Run migrations 039 and 040 in Supabase (see supabase/RUN-PENDING-MIGRATIONS.md).",
      };
    }
    return { error: error.message };
  }

  return { error: null };
}
