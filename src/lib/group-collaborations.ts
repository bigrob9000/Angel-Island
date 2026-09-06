import { createClient } from "@/lib/supabase";
import type {
  CollabPace,
  CollaborationMessage,
  GroupCollabInvite,
  GroupCollabInviteRecipient,
  GroupCollabMemberInvite,
  Profile,
} from "@/lib/types";
import { PROFILE_ATTRIBUTION_FIELDS } from "@/lib/profile";
import { normalizeProfile } from "@/lib/types";
import { loadBlockedUserIds } from "@/lib/blocks";

export const GROUP_COLLAB_MAX_MEMBERS = 6;
export const GROUP_COLLAB_MAX_INVITEES = 5;
export const GROUP_COLLAB_EXPIRY_DAYS = 14;

export type GroupCollabInviteWithMeta = GroupCollabInvite & {
  creator?: Profile;
  recipients: Array<GroupCollabInviteRecipient & { profile?: Profile }>;
  collaboration_id?: string | null;
};

function isGroupCollabMissing(message: string, code?: string): boolean {
  return message.includes("group_collab") || code === "PGRST205";
}

export function groupCollabSetupError(): string {
  return "Group collaborations aren't set up yet. Run migrations 029–031 in Supabase (see supabase/RUN-PENDING-MIGRATIONS.md).";
}

export async function expireStaleGroupCollabInvites(): Promise<void> {
  const supabase = createClient();
  await supabase.rpc("expire_stale_group_collab_invites");
}

export async function createGroupCollabInvite(input: {
  about: string;
  message?: string;
  role?: string;
  pace?: CollabPace | null;
  recipientIds: string[];
}): Promise<{ inviteId?: string; error?: string; tableMissing?: boolean }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_group_collab_invite", {
    p_about: input.about.trim(),
    p_message: input.message?.trim() ?? "",
    p_role: input.role?.trim() ?? "",
    p_pace: input.pace ?? null,
    p_recipient_ids: input.recipientIds,
  });

  if (error) {
    if (isGroupCollabMissing(error.message, error.code)) {
      return { tableMissing: true, error: groupCollabSetupError() };
    }
    return { error: error.message };
  }

  if (!data || typeof data !== "string") {
    return {
      error:
        "Invite may not have saved. Run migration 031_group_collab_invite_visibility.sql in Supabase, then try again.",
    };
  }

  return { inviteId: data };
}

export async function respondToGroupCollabInvite(
  inviteId: string,
  response: "interested" | "maybe" | "not_fit",
): Promise<{ collaborationId?: string | null; error?: string; tableMissing?: boolean }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("respond_to_group_collab_invite", {
    p_invite_id: inviteId,
    p_response: response,
  });

  if (error) {
    if (isGroupCollabMissing(error.message, error.code)) {
      return { tableMissing: true, error: groupCollabSetupError() };
    }
    return { error: error.message };
  }

  const payload = data as { collaboration_id?: string | null } | null;
  return { collaborationId: payload?.collaboration_id ?? null };
}

export async function inviteGroupCollabMember(
  collaborationId: string,
  userId: string,
): Promise<{ inviteId?: string; error?: string; tableMissing?: boolean }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("invite_group_collab_member", {
    p_collaboration_id: collaborationId,
    p_user_id: userId,
  });

  if (error) {
    if (isGroupCollabMissing(error.message, error.code)) {
      return { tableMissing: true, error: groupCollabSetupError() };
    }
    return { error: error.message };
  }

  return { inviteId: data as string };
}

export async function respondToGroupCollabMemberInvite(
  inviteId: string,
  response: "interested" | "maybe" | "not_fit",
): Promise<{ collaborationId?: string; error?: string; tableMissing?: boolean }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("respond_to_group_collab_member_invite", {
    p_invite_id: inviteId,
    p_response: response,
  });

  if (error) {
    if (isGroupCollabMissing(error.message, error.code)) {
      return { tableMissing: true, error: groupCollabSetupError() };
    }
    return { error: error.message };
  }

  const payload = data as { collaboration_id?: string } | null;
  return { collaborationId: payload?.collaboration_id };
}

export function formatMemberNames(profiles: Profile[], max = 3): string {
  const names = profiles
    .map((p) => p.first_name ?? p.username ?? "Someone")
    .filter(Boolean);
  if (names.length === 0) return "Group";
  if (names.length <= max) return names.join(", ");
  return `${names.slice(0, max).join(", ")} +${names.length - max}`;
}

export async function loadPendingGroupCollabInvitesForUser(
  userId: string,
): Promise<{
  received: GroupCollabInviteWithMeta[];
  sent: GroupCollabInviteWithMeta[];
  tableMissing: boolean;
  error?: string;
}> {
  await expireStaleGroupCollabInvites();
  const supabase = createClient();
  const { blockedIds } = await loadBlockedUserIds(userId);

  const { data: rpcData, error: rpcError } = await supabase.rpc("list_pending_group_collab_invites");

  if (!rpcError && rpcData && typeof rpcData === "object") {
    const payload = rpcData as {
      received?: Array<GroupCollabInvite & { recipients?: GroupCollabInviteRecipient[] }>;
      sent?: Array<GroupCollabInvite & { recipients?: GroupCollabInviteRecipient[] }>;
    };

    const rawReceived = payload.received ?? [];
    const rawSent = payload.sent ?? [];

    const profileIds = new Set<string>();
    for (const invite of [...rawReceived, ...rawSent]) {
      profileIds.add(invite.creator_id);
      for (const recipient of invite.recipients ?? []) {
        profileIds.add(recipient.user_id);
      }
    }

    const { data: profiles } = profileIds.size
      ? await supabase.from("profiles").select(PROFILE_ATTRIBUTION_FIELDS).in("id", [...profileIds])
      : { data: [] };

    const profilesById: Record<string, Profile> = {};
    (profiles ?? []).forEach((row) => {
      profilesById[row.id] = normalizeProfile(row as Profile);
    });

    function attachProfiles(
      invite: GroupCollabInvite & { recipients?: GroupCollabInviteRecipient[] },
    ): GroupCollabInviteWithMeta {
      const recipients = (invite.recipients ?? []).map((r) => ({
        ...r,
        profile: profilesById[r.user_id],
      }));
      const { recipients: _drop, ...rest } = invite;
      return {
        ...rest,
        creator: profilesById[invite.creator_id],
        recipients,
      };
    }

    const received = rawReceived
      .map(attachProfiles)
      .filter((invite) => !blockedIds.has(invite.creator_id));
    const sent = rawSent.map(attachProfiles);

    return { received, sent, tableMissing: false };
  }

  if (rpcError && !isGroupCollabMissing(rpcError.message, rpcError.code)) {
    // Fall through to direct queries if RPC missing; surface other RPC errors later.
    if (!rpcError.message.includes("list_pending_group_collab_invites")) {
      return {
        received: [],
        sent: [],
        tableMissing: false,
        error: rpcError.message,
      };
    }
  }

  await expireStaleGroupCollabInvites();

  const { data: recipientRows, error: recvError } = await supabase
    .from("group_collab_invite_recipients")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending");

  if (recvError) {
    return {
      received: [],
      sent: [],
      tableMissing: isGroupCollabMissing(recvError.message, recvError.code),
      error: recvError.message,
    };
  }

  const receivedInviteIds = [
    ...new Set((recipientRows ?? []).map((row) => row.group_invite_id as string)),
  ];

  const { data: receivedInviteRows, error: receivedInvitesError } = receivedInviteIds.length
    ? await supabase
        .from("group_collab_invites")
        .select("*")
        .in("id", receivedInviteIds)
        .eq("status", "pending")
    : { data: [], error: null };

  if (receivedInvitesError) {
    return {
      received: [],
      sent: [],
      tableMissing: isGroupCollabMissing(receivedInvitesError.message, receivedInvitesError.code),
      error: receivedInvitesError.message,
    };
  }

  const { data: sentRows, error: sentError } = await supabase
    .from("group_collab_invites")
    .select("*")
    .eq("creator_id", userId)
    .eq("status", "pending");

  if (sentError) {
    return {
      received: [],
      sent: [],
      tableMissing: isGroupCollabMissing(sentError.message, sentError.code),
      error: sentError.message,
    };
  }

  const allInviteIds = [
    ...new Set([
      ...receivedInviteIds,
      ...(sentRows ?? []).map((row) => row.id as string),
    ]),
  ];

  const { data: allRecipientRows, error: allRecipientsError } = allInviteIds.length
    ? await supabase
        .from("group_collab_invite_recipients")
        .select("*")
        .in("group_invite_id", allInviteIds)
    : { data: [], error: null };

  if (allRecipientsError) {
    // Still return invites even if recipient details fail to load.
    console.warn("group collab recipients load failed:", allRecipientsError.message);
  }

  const recipientsByInviteId = new Map<string, GroupCollabInviteRecipient[]>();
  (allRecipientRows ?? []).forEach((row) => {
    const inviteId = row.group_invite_id as string;
    const list = recipientsByInviteId.get(inviteId) ?? [];
    list.push(row as GroupCollabInviteRecipient);
    recipientsByInviteId.set(inviteId, list);
  });

  const profileIds = new Set<string>();
  (receivedInviteRows ?? []).forEach((invite) => {
    profileIds.add(invite.creator_id);
    (recipientsByInviteId.get(invite.id) ?? []).forEach((r) => profileIds.add(r.user_id));
  });
  (sentRows ?? []).forEach((invite) => {
    profileIds.add(invite.creator_id);
    (recipientsByInviteId.get(invite.id) ?? []).forEach((r) => profileIds.add(r.user_id));
  });

  const { data: profiles } = profileIds.size
    ? await supabase.from("profiles").select(PROFILE_ATTRIBUTION_FIELDS).in("id", [...profileIds])
    : { data: [] };

  const profilesById: Record<string, Profile> = {};
  (profiles ?? []).forEach((row) => {
    profilesById[row.id] = normalizeProfile(row as Profile);
  });

  const received: GroupCollabInviteWithMeta[] = (receivedInviteRows ?? []).map((invite) => {
    const recipients = (recipientsByInviteId.get(invite.id) ?? []).map((r) => ({
      ...r,
      profile: profilesById[r.user_id],
    }));
    return {
      ...(invite as GroupCollabInvite),
      creator: profilesById[invite.creator_id],
      recipients,
    };
  }).filter((invite) => !blockedIds.has(invite.creator_id));

  const sent: GroupCollabInviteWithMeta[] = (sentRows ?? []).map((invite) => {
    const recipients = (recipientsByInviteId.get(invite.id) ?? []).map((r) => ({
      ...r,
      profile: profilesById[r.user_id],
    }));
    return {
      ...(invite as GroupCollabInvite),
      creator: profilesById[invite.creator_id],
      recipients,
    };
  });

  return { received, sent, tableMissing: false };
}

export async function loadPendingGroupMemberInvitesForUser(
  userId: string,
): Promise<{ invites: Array<GroupCollabMemberInvite & { inviter?: Profile; collaborationAbout?: string }>; tableMissing: boolean }> {
  await expireStaleGroupCollabInvites();
  const supabase = createClient();

  const { data, error } = await supabase
    .from("group_collab_member_invites")
    .select("*, collaborations(group_collab_invite_id, group_collab_invites(about))")
    .eq("user_id", userId)
    .eq("status", "pending");

  if (error) {
    return { invites: [], tableMissing: isGroupCollabMissing(error.message, error.code) };
  }

  const inviterIds = [...new Set((data ?? []).map((row) => row.inviter_id))];
  const { data: profiles } = inviterIds.length
    ? await supabase.from("profiles").select(PROFILE_ATTRIBUTION_FIELDS).in("id", inviterIds)
    : { data: [] };

  const profilesById: Record<string, Profile> = {};
  (profiles ?? []).forEach((row) => {
    profilesById[row.id] = normalizeProfile(row as Profile);
  });

  const invites = (data ?? []).map((row) => {
    const collab = row.collaborations as {
      group_collab_invites?: { about: string };
    } | null;
    return {
      ...(row as GroupCollabMemberInvite),
      inviter: profilesById[row.inviter_id],
      collaborationAbout: collab?.group_collab_invites?.about,
    };
  });

  return { invites, tableMissing: false };
}

export async function loadCollaborationMessages(
  collaborationId: string,
): Promise<{ messages: CollaborationMessage[]; tableMissing: boolean }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("collaboration_messages")
    .select("*")
    .eq("collaboration_id", collaborationId)
    .order("created_at", { ascending: true });

  if (error) {
    return {
      messages: [],
      tableMissing: error.message.includes("collaboration_messages") || error.code === "PGRST205",
    };
  }

  return { messages: (data ?? []) as CollaborationMessage[], tableMissing: false };
}

export async function sendCollaborationMessage(
  collaborationId: string,
  body: string,
): Promise<{ message?: CollaborationMessage; error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const trimmed = body.trim();
  if (!trimmed) return { error: "Write a message first." };

  const { data, error } = await supabase
    .from("collaboration_messages")
    .insert({
      collaboration_id: collaborationId,
      sender_id: user.id,
      body: trimmed,
    })
    .select("*")
    .single();

  if (error) return { error: error.message };

  await supabase
    .from("collaborations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", collaborationId);

  return { message: data as CollaborationMessage };
}

export async function loadGroupCollabInviteDetail(
  inviteId: string,
  userId: string,
): Promise<{ invite: GroupCollabInviteWithMeta | null; tableMissing: boolean }> {
  await expireStaleGroupCollabInvites();
  const supabase = createClient();

  const { data: invite, error } = await supabase
    .from("group_collab_invites")
    .select("*, group_collab_invite_recipients(*)")
    .eq("id", inviteId)
    .maybeSingle();

  if (error || !invite) {
    return {
      invite: null,
      tableMissing: error ? isGroupCollabMissing(error.message, error.code) : false,
    };
  }

  const isCreator = invite.creator_id === userId;
  const isRecipient = (invite.group_collab_invite_recipients ?? []).some(
    (r: GroupCollabInviteRecipient) => r.user_id === userId,
  );
  if (!isCreator && !isRecipient) return { invite: null, tableMissing: false };

  const profileIds = new Set<string>([invite.creator_id]);
  (invite.group_collab_invite_recipients ?? []).forEach((r: GroupCollabInviteRecipient) =>
    profileIds.add(r.user_id),
  );

  const { data: collab } = await supabase
    .from("collaborations")
    .select("id")
    .eq("group_collab_invite_id", inviteId)
    .maybeSingle();

  const { data: profiles } = await supabase
    .from("profiles")
    .select(PROFILE_ATTRIBUTION_FIELDS)
    .in("id", [...profileIds]);

  const profilesById: Record<string, Profile> = {};
  (profiles ?? []).forEach((row) => {
    profilesById[row.id] = normalizeProfile(row as Profile);
  });

  return {
    invite: {
      ...(invite as GroupCollabInvite),
      creator: profilesById[invite.creator_id],
      recipients: (invite.group_collab_invite_recipients ?? []).map((r: GroupCollabInviteRecipient) => ({
        ...r,
        profile: profilesById[r.user_id],
      })),
      collaboration_id: collab?.id ?? null,
    },
    tableMissing: false,
  };
}
