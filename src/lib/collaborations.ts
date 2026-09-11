import { createClient } from "@/lib/supabase";
import type {
  CollabInvite,
  Collaboration,
  CollaborationEntry,
  CollaborationMessage,
  CollaborationStatus,
  CollaborationEntryType,
  GroupCollabInvite,
  Profile,
} from "@/lib/types";
import { COLLAB_PACE_LABELS } from "@/lib/types";
import { PROFILE_ATTRIBUTION_FIELDS } from "@/lib/profile";
import { normalizeProfile } from "@/lib/types";
import { formatMemberNames } from "@/lib/group-collaborations";
import { loadArchivedCollaborationIds } from "@/lib/collaboration-archive";

export type CollaborationPreview = Collaboration & {
  isGroup: boolean;
  invite?: CollabInvite;
  groupInvite?: GroupCollabInvite;
  other?: Profile;
  members?: Profile[];
  lastActivityAt: string;
  lastEntryAuthorId?: string | null;
  unread?: boolean;
};

export type CollaborationDetail = CollaborationPreview & {
  entries: CollaborationEntry[];
  messages?: CollaborationMessage[];
};

function isMissingTable(table: string, message: string, code?: string): boolean {
  if (code === "PGRST205") return true;
  const lower = message.toLowerCase();
  if (!lower.includes(table.toLowerCase())) return false;
  return (
    lower.includes("could not find the table") ||
    lower.includes("does not exist") ||
    lower.includes("schema cache")
  );
}

function isCollabWorkspaceMissing(message: string, code?: string): boolean {
  return isMissingTable("collaborations", message, code);
}

export function collaborationsSetupError(): string {
  return "Collaboration workspaces aren't set up yet. Run migration 016_collaborations.sql in Supabase (see supabase/RUN-PENDING-MIGRATIONS.md).";
}

export function collaborationStatusLabel(status: CollaborationStatus): string {
  if (status === "pending_alignment") return "Confirming intent";
  if (status === "paused") return "Paused";
  if (status === "ended") return "Closed";
  return "Active";
}

export function isCollabInviteFullyAligned(invite: CollabInvite): boolean {
  return Boolean(invite.inviter_aligned_at && invite.invitee_aligned_at);
}

export function collaborationFocusLine(preview: CollaborationPreview): string {
  if (preview.isGroup && preview.groupInvite) return preview.groupInvite.about;
  if (preview.invite) return preview.invite.about;
  return "Collaboration";
}

export function collaborationToneLine(preview: CollaborationPreview): string | null {
  const pace = preview.isGroup ? preview.groupInvite?.pace : preview.invite?.pace;
  if (!pace) return null;
  return COLLAB_PACE_LABELS[pace];
}

/** @deprecated use collaborationFocusLine(preview) */
export function collaborationFocusLineFromInvite(invite: CollabInvite): string {
  return invite.about;
}

/** @deprecated use collaborationToneLine(preview) */
export function collaborationToneLineFromInvite(invite: CollabInvite): string | null {
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

const OPEN_COLLABORATION_STATUSES: CollaborationStatus[] = [
  "pending_alignment",
  "active",
  "paused",
];

export type OpenCollaborationMatch = {
  collaborationId: string;
  collabInviteId: string;
  status: CollaborationStatus;
};

export async function findOpenCollaborationBetweenUsers(
  userId: string,
  otherUserId: string
): Promise<OpenCollaborationMatch | null> {
  const supabase = createClient();
  const { data: invites } = await supabase
    .from("collab_invites")
    .select("id, created_at")
    .eq("status", "interested")
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`
    )
    .order("created_at", { ascending: false });

  const inviteIds = (invites ?? []).map((invite) => invite.id);
  if (inviteIds.length === 0) return null;

  const { data: collabs } = await supabase
    .from("collaborations")
    .select("id, collab_invite_id, status, created_at")
    .in("collab_invite_id", inviteIds)
    .in("status", OPEN_COLLABORATION_STATUSES)
    .order("created_at", { ascending: false });

  const open = (collabs ?? [])[0] as
    | { id: string; collab_invite_id: string; status: CollaborationStatus }
    | undefined;
  if (!open?.collab_invite_id) return null;

  return {
    collaborationId: open.id,
    collabInviteId: open.collab_invite_id,
    status: open.status,
  };
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

export function describeCollaborationWorkspaceError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("pending_alignment") ||
    lower.includes("collaborations_status_check")
  ) {
    return "Run migration 037_collab_alignment.sql in Supabase — workspaces need the pending_alignment status.";
  }
  if (lower.includes("create_collaboration_workspace")) {
    return "Run migration 042_collaboration_workspace_create.sql in Supabase (see supabase/RUN-PENDING-MIGRATIONS.md).";
  }
  return message;
}

export async function createCollaborationWorkspace(
  collabInviteId: string,
  chatInviteId: string | null,
  status: CollaborationStatus = "pending_alignment",
): Promise<{ id?: string; error?: string; tableMissing?: boolean }> {
  const supabase = createClient();

  const { data: rpcId, error: rpcError } = await supabase.rpc("create_collaboration_workspace", {
    p_collab_invite_id: collabInviteId,
    p_chat_invite_id: chatInviteId,
  });

  if (!rpcError && typeof rpcId === "string") {
    return { id: rpcId };
  }

  if (rpcError && !rpcError.message.includes("create_collaboration_workspace")) {
    if (isCollabWorkspaceMissing(rpcError.message, rpcError.code)) {
      return { tableMissing: true, error: collaborationsSetupError() };
    }
    return { error: describeCollaborationWorkspaceError(rpcError.message) };
  }

  const { data, error } = await supabase
    .from("collaborations")
    .insert({
      collab_invite_id: collabInviteId,
      chat_invite_id: chatInviteId,
      status,
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
    return { error: describeCollaborationWorkspaceError(error.message) };
  }

  return { id: data.id };
}

export async function withdrawCollabInvite(
  collabInviteId: string,
): Promise<{ error?: string; setupMissing?: boolean }> {
  const supabase = createClient();
  const { error } = await supabase.rpc("withdraw_collab_invite", {
    p_invite_id: collabInviteId,
  });

  if (error) {
    if (error.message.includes("withdraw_collab_invite")) {
      return {
        setupMissing: true,
        error:
          "Withdraw isn't set up yet. Run migration 043_collab_invite_withdraw.sql in Supabase (see supabase/RUN-PENDING-MIGRATIONS.md).",
      };
    }
    return { error: error.message };
  }

  return {};
}

export async function loadCollaborationPreviews(
  userId: string,
  filter: "active" | "paused" | "past",
  options?: { archivedOnly?: boolean },
): Promise<{ previews: CollaborationPreview[]; tableMissing: boolean }> {
  const supabase = createClient();
  const archivedIds = await loadArchivedCollaborationIds(userId);

  const { data: invites, error: inviteError } = await supabase
    .from("collab_invites")
    .select("*")
    .eq("status", "interested")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

  if (inviteError) {
    return { previews: [], tableMissing: false };
  }

  const interestedInvites = (invites ?? []) as CollabInvite[];

  const inviteIds = interestedInvites.map((invite) => invite.id);
  const { data: collabs, error } = inviteIds.length
    ? await supabase.from("collaborations").select("*").in("collab_invite_id", inviteIds)
    : { data: [], error: null };

  if (error) {
    if (isCollabWorkspaceMissing(error.message, error.code)) {
      return { previews: [], tableMissing: true };
    }
    return { previews: [], tableMissing: false };
  }

  const inviteById = Object.fromEntries(interestedInvites.map((invite) => [invite.id, invite]));
  const statuses =
    filter === "active"
      ? new Set<CollaborationStatus>(["active", "pending_alignment"])
      : filter === "paused"
        ? new Set<CollaborationStatus>(["paused"])
        : new Set<CollaborationStatus>(["ended"]);

  const filtered = ((collabs ?? []) as Collaboration[]).filter((collab) =>
    statuses.has(collab.status)
  );

  const otherIds = filtered.map((collab) =>
    otherUserId(inviteById[collab.collab_invite_id!], userId)
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
        .select("collaboration_id, author_id, created_at, updated_at")
        .in("collaboration_id", collabIds)
        .order("updated_at", { ascending: false })
    : { data: [] };

  const lastActivity: Record<string, string> = {};
  const lastEntryAuthor: Record<string, string | null> = {};
  filtered.forEach((collab) => {
    lastActivity[collab.id] = collab.updated_at ?? collab.created_at;
    lastEntryAuthor[collab.id] = null;
  });
  (entryRows ?? []).forEach((row) => {
    if (lastEntryAuthor[row.collaboration_id] != null) return;
    const at = row.updated_at ?? row.created_at;
    lastActivity[row.collaboration_id] = at;
    lastEntryAuthor[row.collaboration_id] = row.author_id;
  });

  const previews: CollaborationPreview[] = filtered.map((collab) => {
    const invite = inviteById[collab.collab_invite_id!];
    const otherId = otherUserId(invite, userId);
    return {
      ...collab,
      isGroup: false,
      invite,
      other: profilesById[otherId],
      lastActivityAt: lastActivity[collab.id] ?? collab.created_at,
      lastEntryAuthorId: lastEntryAuthor[collab.id] ?? null,
    };
  });

  const { data: memberRows } = await supabase
    .from("collaboration_members")
    .select("collaboration_id")
    .eq("user_id", userId);

  const groupCollabIds = (memberRows ?? []).map((row) => row.collaboration_id);
  let groupPreviews: CollaborationPreview[] = [];

  if (groupCollabIds.length > 0) {
    const { data: groupCollabs, error: groupError } = await supabase
      .from("collaborations")
      .select("*")
      .in("id", groupCollabIds)
      .not("group_collab_invite_id", "is", null);

    if (!groupError && groupCollabs?.length) {
      const filteredGroup = (groupCollabs as Collaboration[]).filter((collab) =>
        statuses.has(collab.status),
      );
      const groupInviteIds = filteredGroup
        .map((c) => c.group_collab_invite_id)
        .filter(Boolean) as string[];

      const { data: groupInvites } = groupInviteIds.length
        ? await supabase.from("group_collab_invites").select("*").in("id", groupInviteIds)
        : { data: [] };

      const groupInviteById = Object.fromEntries(
        ((groupInvites ?? []) as GroupCollabInvite[]).map((g) => [g.id, g]),
      );

      const gCollabIds = filteredGroup.map((c) => c.id);
      const { data: allMembers } = gCollabIds.length
        ? await supabase
            .from("collaboration_members")
            .select("collaboration_id, user_id")
            .in("collaboration_id", gCollabIds)
        : { data: [] };

      const memberUserIds = [...new Set((allMembers ?? []).map((m) => m.user_id))];
      const { data: memberProfiles } = memberUserIds.length
        ? await supabase.from("profiles").select(PROFILE_ATTRIBUTION_FIELDS).in("id", memberUserIds)
        : { data: [] };

      const memberProfilesById: Record<string, Profile> = {};
      (memberProfiles ?? []).forEach((row) => {
        memberProfilesById[row.id] = normalizeProfile(row as Profile);
      });

      const membersByCollab: Record<string, Profile[]> = {};
      (allMembers ?? []).forEach((m) => {
        if (!membersByCollab[m.collaboration_id]) membersByCollab[m.collaboration_id] = [];
        const profile = memberProfilesById[m.user_id];
        if (profile) membersByCollab[m.collaboration_id].push(profile);
      });

      const { data: groupEntryRows } = gCollabIds.length
        ? await supabase
            .from("collaboration_entries")
            .select("collaboration_id, author_id, created_at, updated_at")
            .in("collaboration_id", gCollabIds)
            .order("updated_at", { ascending: false })
        : { data: [] };

      const { data: groupMessageRows } = gCollabIds.length
        ? await supabase
            .from("collaboration_messages")
            .select("collaboration_id, sender_id, created_at")
            .in("collaboration_id", gCollabIds)
            .order("created_at", { ascending: false })
        : { data: [] };

      const groupLastActivity: Record<string, string> = {};
      const groupLastAuthor: Record<string, string | null> = {};
      filteredGroup.forEach((collab) => {
        groupLastActivity[collab.id] = collab.updated_at ?? collab.created_at;
        groupLastAuthor[collab.id] = null;
      });
      (groupEntryRows ?? []).forEach((row) => {
        if (groupLastAuthor[row.collaboration_id] != null) return;
        const at = row.updated_at ?? row.created_at;
        groupLastActivity[row.collaboration_id] = at;
        groupLastAuthor[row.collaboration_id] = row.author_id;
      });
      (groupMessageRows ?? []).forEach((row) => {
        const cur = groupLastActivity[row.collaboration_id];
        if (!cur || row.created_at > cur) {
          groupLastActivity[row.collaboration_id] = row.created_at;
          groupLastAuthor[row.collaboration_id] = row.sender_id;
        }
      });

      groupPreviews = filteredGroup
        .filter((collab) => groupInviteById[collab.group_collab_invite_id!]?.status === "open")
        .map((collab) => {
          const groupInvite = groupInviteById[collab.group_collab_invite_id!];
          const members = (membersByCollab[collab.id] ?? []).filter((p) => p.id !== userId);
          return {
            ...collab,
            isGroup: true,
            groupInvite,
            members,
            other: members[0],
            lastActivityAt: groupLastActivity[collab.id] ?? collab.created_at,
            lastEntryAuthorId: groupLastAuthor[collab.id] ?? null,
          };
        });
    }
  }

  let combined = [...previews, ...groupPreviews];

  if (options?.archivedOnly) {
    combined = combined.filter((preview) => archivedIds.has(preview.id));
  } else if (filter === "past") {
    combined = combined.filter((preview) => !archivedIds.has(preview.id));
  }

  combined.sort(
    (a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
  );

  return { previews: combined, tableMissing: false };
}

export async function loadCollaborationDetail(
  collaborationId: string,
  userId: string
): Promise<{ detail: CollaborationDetail | null; tableMissing: boolean; loadError?: string | null }> {
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
    return { detail: null, tableMissing: false, loadError: error.message };
  }
  if (!collab) return { detail: null, tableMissing: false };

  const row = collab as Collaboration;

  if (row.group_collab_invite_id) {
    const { data: membership } = await supabase
      .from("collaboration_members")
      .select("user_id")
      .eq("collaboration_id", collaborationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!membership) return { detail: null, tableMissing: false };

    const [{ data: groupInvite }, { data: members }, { data: entries }, { data: messages }] =
      await Promise.all([
        supabase
          .from("group_collab_invites")
          .select("*")
          .eq("id", row.group_collab_invite_id)
          .maybeSingle(),
        supabase.from("collaboration_members").select("user_id, is_creator").eq("collaboration_id", collaborationId),
        supabase
          .from("collaboration_entries")
          .select("*")
          .eq("collaboration_id", collaborationId)
          .order("created_at", { ascending: true }),
        supabase
          .from("collaboration_messages")
          .select("*")
          .eq("collaboration_id", collaborationId)
          .order("created_at", { ascending: true }),
      ]);

    if (!groupInvite) return { detail: null, tableMissing: false };

    const memberIds = (members ?? []).map((m) => m.user_id);
    const { data: profiles } = memberIds.length
      ? await supabase.from("profiles").select(PROFILE_ATTRIBUTION_FIELDS).in("id", memberIds)
      : { data: [] };

    const memberProfiles = (profiles ?? []).map((p) => normalizeProfile(p as Profile));
    const others = memberProfiles.filter((p) => p.id !== userId);
    const lastEntry = (entries ?? [])[entries!.length - 1] as CollaborationEntry | undefined;
    const lastMessage = (messages ?? [])[messages!.length - 1] as CollaborationMessage | undefined;
    const entryAt = lastEntry?.updated_at ?? lastEntry?.created_at;
    const messageAt = lastMessage?.created_at;
    const lastActivityAt =
      entryAt && messageAt
        ? entryAt > messageAt
          ? entryAt
          : messageAt
        : entryAt ?? messageAt ?? row.updated_at ?? row.created_at;

    return {
      detail: {
        ...row,
        isGroup: true,
        groupInvite: groupInvite as GroupCollabInvite,
        members: others,
        other: others[0],
        lastActivityAt,
        lastEntryAuthorId: lastEntry?.author_id ?? lastMessage?.sender_id ?? null,
        entries: (entries ?? []) as CollaborationEntry[],
        messages: (messages ?? []) as CollaborationMessage[],
      },
      tableMissing: false,
    };
  }

  const inviteMap = await loadInviteMap([row.collab_invite_id!]);
  const invite = inviteMap[row.collab_invite_id!];
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
      ...(row as Collaboration),
      isGroup: false,
      invite,
      other: profile ? normalizeProfile(profile as Profile) : undefined,
      lastActivityAt:
        (entries ?? []).length > 0
          ? ((entries as CollaborationEntry[])[entries!.length - 1].updated_at ??
            (entries as CollaborationEntry[])[entries!.length - 1].created_at)
          : (row.updated_at ?? row.created_at),
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
  try {
    const response = await fetch("/api/collaborations/entries", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        collaborationId: input.collaborationId,
        entryType: input.entryType,
        body: input.body,
        url: input.url,
      }),
    });

    const payload = (await response.json()) as {
      entry?: CollaborationEntry;
      error?: string;
      tableMissing?: boolean;
    };

    if (!response.ok) {
      if (payload.tableMissing) {
        return { tableMissing: true, error: collaborationsSetupError() };
      }
      return { error: payload.error ?? "Could not add to collaboration." };
    }

    return { entry: payload.entry };
  } catch {
    return { error: "Could not add to collaboration." };
  }
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

function collabChatContext(invite: CollabInvite): string {
  let context = `About: ${invite.about}`;
  if (invite.role) context += ` · Role: ${invite.role}`;
  if (invite.pace) context += ` · Pace: ${COLLAB_PACE_LABELS[invite.pace]}`;
  return context;
}

async function findAcceptedChatInviteBetweenUsers(
  userA: string,
  userB: string,
): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("chat_invites")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(sender_id.eq.${userA},receiver_id.eq.${userB}),and(sender_id.eq.${userB},receiver_id.eq.${userA})`,
    )
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

async function activateCollaborationAfterAlignment(
  invite: CollabInvite,
  collaborationId: string,
  userId: string,
): Promise<{ error?: string; tableMissing?: boolean }> {
  const supabase = createClient();

  let chatInviteId = null as string | null;
  const { data: existingCollab } = await supabase
    .from("collaborations")
    .select("chat_invite_id")
    .eq("id", collaborationId)
    .maybeSingle();

  chatInviteId = existingCollab?.chat_invite_id ?? null;

  if (!chatInviteId) {
    chatInviteId = await findAcceptedChatInviteBetweenUsers(invite.sender_id, invite.receiver_id);
  }

  if (!chatInviteId) {
    const otherId = invite.sender_id === userId ? invite.receiver_id : invite.sender_id;
    const { data: newChat, error: chatError } = await supabase
      .from("chat_invites")
      .insert({
        sender_id: userId,
        receiver_id: otherId,
        status: "accepted",
        optional_message: collabChatContext(invite),
      })
      .select("id")
      .single();

    if (chatError) {
      return { error: chatError.message };
    }
    chatInviteId = newChat?.id ?? null;
  }

  const { error } = await supabase
    .from("collaborations")
    .update({
      status: "active",
      chat_invite_id: chatInviteId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", collaborationId);

  if (error) {
    if (isCollabWorkspaceMissing(error.message, error.code)) {
      return { tableMissing: true, error: collaborationsSetupError() };
    }
    return { error: error.message };
  }

  return {};
}

export async function ensureCollaborationActivated(
  detail: CollaborationDetail,
  userId: string,
): Promise<{ detail?: CollaborationDetail; error?: string; tableMissing?: boolean }> {
  if (detail.status !== "pending_alignment" || detail.isGroup || !detail.invite) {
    return { detail };
  }
  if (!isCollabInviteFullyAligned(detail.invite)) {
    return { detail };
  }

  const activation = await activateCollaborationAfterAlignment(detail.invite, detail.id, userId);
  if (activation.error) {
    return activation;
  }

  const result = await loadCollaborationDetail(detail.id, userId);
  if (result.tableMissing) {
    return { tableMissing: true, error: collaborationsSetupError() };
  }
  if (!result.detail) {
    return { error: "Collaboration workspace not found." };
  }

  return { detail: result.detail };
}

export async function confirmCollabAlignment(
  collabInviteId: string,
  userId: string,
  inviteMeta: Pick<CollabInvite, "about" | "role" | "pace">
): Promise<{ detail?: CollaborationDetail; error?: string; tableMissing?: boolean }> {
  const supabase = createClient();
  const now = new Date().toISOString();

  const { data: inviteRow, error: loadError } = await supabase
    .from("collab_invites")
    .select("*")
    .eq("id", collabInviteId)
    .maybeSingle();

  if (loadError || !inviteRow) {
    return { error: loadError?.message ?? "Collab invite not found." };
  }

  const invite = inviteRow as CollabInvite;
  if (invite.status !== "interested") {
    return { error: "This invite is no longer open for alignment." };
  }
  if (invite.sender_id !== userId && invite.receiver_id !== userId) {
    return { error: "You don't have access to this collaboration." };
  }

  const isInviter = invite.sender_id === userId;
  const patch: Record<string, string> = {};
  if (isInviter && !invite.inviter_aligned_at) {
    patch.inviter_aligned_at = now;
  }
  if (!isInviter && !invite.invitee_aligned_at) {
    patch.invitee_aligned_at = now;
  }

  if (Object.keys(patch).length > 0) {
    const { error: updateError } = await supabase
      .from("collab_invites")
      .update(patch)
      .eq("id", collabInviteId);

    if (updateError) {
      if (updateError.message.includes("inviter_aligned_at")) {
        return {
          tableMissing: true,
          error:
            "Collab alignment isn't set up yet. Run migration 037_collab_alignment.sql in Supabase.",
        };
      }
      return { error: updateError.message };
    }
  }

  const alignedInvite: CollabInvite = {
    ...invite,
    ...inviteMeta,
    inviter_aligned_at: invite.inviter_aligned_at ?? patch.inviter_aligned_at ?? null,
    invitee_aligned_at: invite.invitee_aligned_at ?? patch.invitee_aligned_at ?? null,
  };

  const collaborationId = await findCollaborationIdByInvite(collabInviteId);
  if (!collaborationId) {
    return { error: "Collaboration workspace not found." };
  }

  const result = await loadCollaborationDetail(collaborationId, userId);
  if (result.tableMissing) {
    return { tableMissing: true, error: collaborationsSetupError() };
  }
  if (!result.detail) {
    return { error: "Collaboration workspace not found." };
  }

  const withAlignedInvite: CollaborationDetail = {
    ...result.detail,
    invite: alignedInvite,
  };

  if (isCollabInviteFullyAligned(alignedInvite)) {
    return ensureCollaborationActivated(withAlignedInvite, userId);
  }

  return { detail: withAlignedInvite };
}
