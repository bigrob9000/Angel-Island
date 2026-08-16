import { createClient } from "@/lib/supabase";
import type {
  CollabInvite,
  Collaboration,
  CollaborationEntry,
  CollaborationStatus,
  CollaborationEntryType,
  Profile,
} from "@/lib/types";
import { COLLAB_PACE_LABELS } from "@/lib/types";
import { PROFILE_ATTRIBUTION_FIELDS } from "@/lib/profile";
import { normalizeProfile } from "@/lib/types";

export type CollaborationPreview = Collaboration & {
  invite: CollabInvite;
  other?: Profile;
  lastActivityAt: string;
};

export type CollaborationDetail = CollaborationPreview & {
  entries: CollaborationEntry[];
};

function isCollabWorkspaceMissing(message: string, code?: string): boolean {
  return message.includes("collaborations") || code === "PGRST205";
}

export function collaborationsSetupError(): string {
  return "Collaboration workspaces aren't set up yet. Run migration 016_collaborations.sql in Supabase (see supabase/RUN-PENDING-MIGRATIONS.md).";
}

export function collaborationStatusLabel(status: CollaborationStatus): string {
  if (status === "paused") return "Paused";
  if (status === "ended") return "Closed";
  return "Active";
}

export function collaborationFocusLine(invite: CollabInvite): string {
  return invite.about;
}

export function collaborationToneLine(invite: CollabInvite): string | null {
  if (!invite.pace) return null;
  return COLLAB_PACE_LABELS[invite.pace];
}

/** After this many days without activity, show a soft quiet hint (no nudges). */
export const COLLAB_QUIET_AFTER_MS = 14 * 24 * 60 * 60 * 1000;

export function isCollaborationQuiet(
  lastActivityAt: string,
  nowMs: number = Date.now(),
): boolean {
  return nowMs - new Date(lastActivityAt).getTime() > COLLAB_QUIET_AFTER_MS;
}

export function collaborationQuietLine(lastActivityAt: string): string | null {
  if (!isCollaborationQuiet(lastActivityAt)) return null;
  return "This collaboration has been quiet for a while. No rush — resume whenever it feels right.";
}

async function loadInviteMap(
  inviteIds: string[]
): Promise<Record<string, CollabInvite>> {
  if (inviteIds.length === 0) return {};
  const supabase = createClient();
  const { data } = await supabase.from("collab_invites").select("*").in("id", inviteIds);
  const map: Record<string, CollabInvite> = {};
  (data ?? []).forEach((row) => {
    map[row.id] = row as CollabInvite;
  });
  return map;
}

function otherUserId(invite: CollabInvite, userId: string): string {
  return invite.sender_id === userId ? invite.receiver_id : invite.sender_id;
}

export async function findCollaborationIdByInvite(
  collabInviteId: string
): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("collaborations")
    .select("id")
    .eq("collab_invite_id", collabInviteId)
    .maybeSingle();
  return data?.id ?? null;
}

export async function createCollaborationWorkspace(
  collabInviteId: string,
  chatInviteId: string | null
): Promise<{ id?: string; error?: string; tableMissing?: boolean }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("collaborations")
    .insert({
      collab_invite_id: collabInviteId,
      chat_invite_id: chatInviteId,
      status: "active",
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: existing } = await supabase
        .from("collaborations")
        .select("id")
        .eq("collab_invite_id", collabInviteId)
        .maybeSingle();
      return existing ? { id: existing.id } : { error: error.message };
    }
    if (isCollabWorkspaceMissing(error.message, error.code)) {
      return { tableMissing: true, error: collaborationsSetupError() };
    }
    return { error: error.message };
  }

  return { id: data.id };
}

export async function loadCollaborationPreviews(
  userId: string,
  filter: "active" | "paused" | "past"
): Promise<{ previews: CollaborationPreview[]; tableMissing: boolean }> {
  const supabase = createClient();

  const { data: invites, error: inviteError } = await supabase
    .from("collab_invites")
    .select("*")
    .eq("status", "interested")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

  if (inviteError) {
    return { previews: [], tableMissing: false };
  }

  const interestedInvites = (invites ?? []) as CollabInvite[];
  if (interestedInvites.length === 0) {
    return { previews: [], tableMissing: false };
  }

  const inviteIds = interestedInvites.map((invite) => invite.id);
  const { data: collabs, error } = await supabase
    .from("collaborations")
    .select("*")
    .in("collab_invite_id", inviteIds);

  if (error) {
    if (isCollabWorkspaceMissing(error.message, error.code)) {
      return { previews: [], tableMissing: true };
    }
    return { previews: [], tableMissing: false };
  }

  const inviteById = Object.fromEntries(interestedInvites.map((invite) => [invite.id, invite]));
  const statuses =
    filter === "active"
      ? new Set<CollaborationStatus>(["active"])
      : filter === "paused"
        ? new Set<CollaborationStatus>(["paused"])
        : new Set<CollaborationStatus>(["ended"]);

  const filtered = ((collabs ?? []) as Collaboration[]).filter((collab) =>
    statuses.has(collab.status)
  );

  const otherIds = filtered.map((collab) =>
    otherUserId(inviteById[collab.collab_invite_id], userId)
  );

  const { data: profiles } = await supabase
    .from("profiles")
    .select(PROFILE_ATTRIBUTION_FIELDS)
    .in("id", [...new Set(otherIds)]);

  const profilesById: Record<string, Profile> = {};
  (profiles ?? []).forEach((row) => {
    profilesById[row.id] = normalizeProfile(row as Profile);
  });

  const collabIds = filtered.map((collab) => collab.id);
  const { data: entryRows } = collabIds.length
    ? await supabase
        .from("collaboration_entries")
        .select("collaboration_id, created_at, updated_at")
        .in("collaboration_id", collabIds)
        .order("updated_at", { ascending: false })
    : { data: [] };

  const lastActivity: Record<string, string> = {};
  filtered.forEach((collab) => {
    lastActivity[collab.id] = collab.updated_at ?? collab.created_at;
  });
  (entryRows ?? []).forEach((row) => {
    const at = row.updated_at ?? row.created_at;
    if (!lastActivity[row.collaboration_id] || at > lastActivity[row.collaboration_id]) {
      lastActivity[row.collaboration_id] = at;
    }
  });

  const previews: CollaborationPreview[] = filtered.map((collab) => {
    const invite = inviteById[collab.collab_invite_id];
    const otherId = otherUserId(invite, userId);
    return {
      ...collab,
      invite,
      other: profilesById[otherId],
      lastActivityAt: lastActivity[collab.id] ?? collab.created_at,
    };
  });

  previews.sort(
    (a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
  );

  return { previews, tableMissing: false };
}

export async function loadCollaborationDetail(
  collaborationId: string,
  userId: string
): Promise<{ detail: CollaborationDetail | null; tableMissing: boolean }> {
  const supabase = createClient();

  const { data: collab, error } = await supabase
    .from("collaborations")
    .select("*")
    .eq("id", collaborationId)
    .maybeSingle();

  if (error) {
    if (isCollabWorkspaceMissing(error.message, error.code)) {
      return { detail: null, tableMissing: true };
    }
    return { detail: null, tableMissing: false };
  }
  if (!collab) return { detail: null, tableMissing: false };

  const inviteMap = await loadInviteMap([(collab as Collaboration).collab_invite_id]);
  const invite = inviteMap[(collab as Collaboration).collab_invite_id];
  if (!invite) return { detail: null, tableMissing: false };
  if (invite.sender_id !== userId && invite.receiver_id !== userId) {
    return { detail: null, tableMissing: false };
  }

  const otherId = otherUserId(invite, userId);
  const [{ data: profile }, { data: entries }] = await Promise.all([
    supabase.from("profiles").select(PROFILE_ATTRIBUTION_FIELDS).eq("id", otherId).maybeSingle(),
    supabase
      .from("collaboration_entries")
      .select("*")
      .eq("collaboration_id", collaborationId)
      .order("created_at", { ascending: true }),
  ]);

  return {
    detail: {
      ...(collab as Collaboration),
      invite,
      other: profile ? normalizeProfile(profile as Profile) : undefined,
      lastActivityAt:
        (entries ?? []).length > 0
          ? ((entries as CollaborationEntry[])[entries!.length - 1].updated_at ??
            (entries as CollaborationEntry[])[entries!.length - 1].created_at)
          : ((collab as Collaboration).updated_at ?? (collab as Collaboration).created_at),
      entries: (entries ?? []) as CollaborationEntry[],
    },
    tableMissing: false,
  };
}

export async function updateCollaborationStatus(
  collaborationId: string,
  status: CollaborationStatus,
  userId: string,
  chatInviteId: string | null
): Promise<{ error?: string; tableMissing?: boolean }> {
  const supabase = createClient();
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status,
    updated_at: now,
  };

  if (status === "paused") {
    patch.paused_at = now;
    patch.paused_by = userId;
    patch.ended_at = null;
  }
  if (status === "active") {
    patch.paused_at = null;
    patch.paused_by = null;
  }
  if (status === "ended") {
    patch.ended_at = now;
  }

  const { error } = await supabase.from("collaborations").update(patch).eq("id", collaborationId);
  if (error) {
    if (isCollabWorkspaceMissing(error.message, error.code)) {
      return { tableMissing: true, error: collaborationsSetupError() };
    }
    return { error: error.message };
  }

  if (chatInviteId) {
    const chatPatch: Record<string, unknown> = {
      conversation_status: status === "active" ? "active" : status,
    };
    if (status === "paused") {
      chatPatch.paused_at = now;
      chatPatch.paused_by = userId;
      chatPatch.ended_at = null;
    }
    if (status === "active") {
      chatPatch.paused_at = null;
      chatPatch.paused_by = null;
    }
    if (status === "ended") {
      chatPatch.ended_at = now;
      chatPatch.paused_by = null;
    }
    await supabase.from("chat_invites").update(chatPatch).eq("id", chatInviteId);
  }

  return {};
}

export async function addCollaborationEntry(input: {
  collaborationId: string;
  userId: string;
  entryType: CollaborationEntryType;
  body?: string | null;
  url?: string | null;
}): Promise<{ entry?: CollaborationEntry; error?: string; tableMissing?: boolean }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("collaboration_entries")
    .insert({
      collaboration_id: input.collaborationId,
      author_id: input.userId,
      entry_type: input.entryType,
      body: input.body?.trim() || null,
      url: input.url?.trim() || null,
    })
    .select("*")
    .single();

  if (error) {
    if (isCollabWorkspaceMissing(error.message, error.code)) {
      return { tableMissing: true, error: collaborationsSetupError() };
    }
    return { error: error.message };
  }

  await supabase
    .from("collaborations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", input.collaborationId);

  return { entry: data as CollaborationEntry };
}

export async function toggleCollaborationStep(
  entryId: string,
  isDone: boolean
): Promise<{ error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("collaboration_entries")
    .update({ is_done: isDone, updated_at: new Date().toISOString() })
    .eq("id", entryId);
  return error ? { error: error.message } : {};
}

export async function deleteCollaborationEntry(entryId: string): Promise<{ error?: string }> {
  const supabase = createClient();
  const { error } = await supabase.from("collaboration_entries").delete().eq("id", entryId);
  return error ? { error: error.message } : {};
}
