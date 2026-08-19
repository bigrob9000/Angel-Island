import type { CollaborationStatus } from "@/lib/types";
import { createClient } from "@/lib/supabase";
import type { Profile, Room, ConversationStatus } from "@/lib/types";
import { normalizeProfile, normalizeConversationStatus } from "@/lib/types";
import { conversationPreviewText } from "@/lib/conversations";
import { loadBlockedUserIds } from "@/lib/blocks";
import { isDiscoverableProfile, PROFILE_ATTRIBUTION_FIELDS } from "@/lib/profile";
import {
  collaborationFocusLine,
  loadCollaborationPreviews,
} from "@/lib/collaborations";

export type ConversationSearchResult = {
  id: string;
  otherName: string;
  preview: string;
  reason: string;
  conversation_status: ConversationStatus;
};

export type CollaborationSearchResult = {
  id: string;
  otherName: string;
  focus: string;
  preview: string;
  reason: string;
  status: CollaborationStatus;
};

export async function searchAll(query: string, userId?: string) {
  const q = query.trim();
  if (!q) {
    return {
      rooms: [] as Room[],
      people: [] as Profile[],
      conversations: [] as ConversationSearchResult[],
      collaborations: [] as CollaborationSearchResult[],
    };
  }

  const supabase = createClient();
  const needle = q.toLowerCase();

  const { blockedIds } = userId
    ? await loadBlockedUserIds(userId)
    : { blockedIds: new Set<string>() };

  const matchesText = (values: (string | null | undefined)[]) =>
    values.some((v) => v?.toLowerCase().includes(needle));

  const [roomsRes, peopleRes, conversations, collaborations] = await Promise.all([
    supabase.from("rooms").select("*").order("name"),
    supabase.from("profiles").select("*").order("updated_at", { ascending: false }),
    userId ? searchConversations(needle, userId, blockedIds) : Promise.resolve([]),
    userId ? searchCollaborations(needle, userId, blockedIds) : Promise.resolve([]),
  ]);

  const rooms = ((roomsRes.data ?? []) as Room[]).filter((room) =>
    matchesText([room.name, room.description])
  );

  const people = ((peopleRes.data ?? []) as Profile[])
    .map((row) => normalizeProfile(row))
    .filter((profile) => profile.id !== userId)
    .filter((profile) => isDiscoverableProfile(profile))
    .filter((profile) => !blockedIds.has(profile.id))
    .filter((profile) =>
      matchesText([
        profile.first_name,
        profile.username,
        profile.location,
        profile.about,
        profile.pronouns,
        profile.work_links,
        ...profile.here_for,
        ...profile.open_to,
        ...profile.roles,
        ...profile.genres_make,
        ...profile.genres_love,
      ])
    );

  return { rooms, people, conversations, collaborations };
}

/** @deprecated Use searchAll */
export async function searchPeopleAndRooms(query: string, userId?: string) {
  const { rooms, people } = await searchAll(query, userId);
  return { rooms, people };
}

async function searchConversations(
  needle: string,
  userId: string,
  blockedIds: Set<string>
): Promise<ConversationSearchResult[]> {
  const supabase = createClient();

  const { data: convs } = await supabase
    .from("chat_invites")
    .select(
      `
      id,
      optional_message,
      conversation_status,
      sender_id,
      receiver_id,
      messages (body)
    `
    )
    .eq("status", "accepted")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

  if (!convs?.length) return [];

  const otherIds = [
    ...new Set(
      convs.map((c) => (c.sender_id === userId ? c.receiver_id : c.sender_id))
    ),
  ];

  const { data: profiles } = await supabase
    .from("profiles")
    .select(PROFILE_ATTRIBUTION_FIELDS)
    .in("id", otherIds);

  const profilesById: Record<string, { first_name: string | null; username: string | null }> = {};
  (profiles ?? []).forEach((p) => {
    profilesById[p.id] = p;
  });

  const results: ConversationSearchResult[] = [];

  for (const conv of convs) {
    const otherId = conv.sender_id === userId ? conv.receiver_id : conv.sender_id;
    if (blockedIds.has(otherId)) continue;
    const other = profilesById[otherId];
    const otherName = other?.first_name ?? other?.username ?? "Someone";
    const messageBodies = ((conv.messages ?? []) as { body: string }[]).map((m) => m.body);
    const haystack = [otherName, other?.username, conv.optional_message, ...messageBodies].filter(
      Boolean
    ) as string[];

    const matched = haystack.some((v) => v.toLowerCase().includes(needle));
    if (!matched) continue;

    const matchedMessage = messageBodies.find((b) => b.toLowerCase().includes(needle));
    let reason = `Matches "${needle}" with ${otherName}`;
    if (matchedMessage) reason = `Matches "${needle}" in your conversation`;
    else if (conv.optional_message?.toLowerCase().includes(needle)) {
      reason = `Matches "${needle}" in invite context`;
    }

    const lastBody = messageBodies.length > 0 ? messageBodies[messageBodies.length - 1] : undefined;
    results.push({
      id: conv.id,
      otherName,
      preview: conversationPreviewText(matchedMessage ?? lastBody, conv.optional_message),
      reason,
      conversation_status: normalizeConversationStatus(conv.conversation_status),
    });
  }

  return results;
}

async function searchCollaborations(
  needle: string,
  userId: string,
  blockedIds: Set<string>,
): Promise<CollaborationSearchResult[]> {
  const supabase = createClient();
  const previewMap = new Map<string, Awaited<ReturnType<typeof loadCollaborationPreviews>>["previews"][number]>();

  for (const filter of ["active", "paused", "past"] as const) {
    const { previews } = await loadCollaborationPreviews(userId, filter);
    for (const preview of previews) {
      previewMap.set(preview.id, preview);
    }
  }

  const collabIds = [...previewMap.keys()];
  const entryPreviewByCollab: Record<string, string> = {};

  if (collabIds.length > 0) {
    const { data: entries } = await supabase
      .from("collaboration_entries")
      .select("collaboration_id, body, url")
      .in("collaboration_id", collabIds);

    for (const entry of entries ?? []) {
      const text = [entry.body, entry.url].filter(Boolean).join(" ");
      if (text.toLowerCase().includes(needle)) {
        entryPreviewByCollab[entry.collaboration_id] = text.slice(0, 140);
      }
    }
  }

  const results: CollaborationSearchResult[] = [];

  for (const preview of previewMap.values()) {
    const otherId =
      preview.invite.sender_id === userId ? preview.invite.receiver_id : preview.invite.sender_id;
    if (blockedIds.has(otherId)) continue;

    const otherName = preview.other?.first_name ?? preview.other?.username ?? "Collaborator";
    const haystack = [
      preview.invite.about,
      preview.invite.message,
      preview.invite.role,
      otherName,
      preview.other?.username,
    ].filter(Boolean) as string[];

    const entryPreview = entryPreviewByCollab[preview.id];
    const matched = haystack.some((value) => value.toLowerCase().includes(needle)) || Boolean(entryPreview);
    if (!matched) continue;

    results.push({
      id: preview.id,
      otherName,
      focus: collaborationFocusLine(preview.invite),
      preview: entryPreview ?? preview.invite.message ?? preview.invite.about,
      reason: entryPreview
        ? `Matches "${needle}" in workspace notes or links`
        : `Matches "${needle}" in collaboration details`,
      status: preview.status,
    });
  }

  return results;
}
