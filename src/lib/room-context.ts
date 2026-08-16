export type RoomProfileContext = {
  roomSlug: string;
  postId?: string;
};

export function buildProfileUrlFromRoom(
  username: string,
  context: RoomProfileContext,
  options?: { invite?: boolean },
): string {
  const params = new URLSearchParams();
  params.set("from", "room");
  params.set("room", context.roomSlug);
  if (context.postId) params.set("post", context.postId);
  if (options?.invite) params.set("invite", "1");
  return `/people/${encodeURIComponent(username)}?${params.toString()}`;
}

export function parseRoomProfileContext(
  params: Pick<URLSearchParams, "get">,
): RoomProfileContext | null {
  if (params.get("from") !== "room") return null;
  const roomSlug = params.get("room")?.trim();
  if (!roomSlug) return null;
  const postId = params.get("post")?.trim();
  return { roomSlug, postId: postId || undefined };
}

export function postPreviewText(body: string, max = 140): string {
  const trimmed = body.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function suggestedInviteMessageFromRoom(
  roomName: string,
  options?: { roomSlug?: string; postPreview?: string | null },
): string {
  const preview = options?.postPreview?.trim();
  if (options?.roomSlug === "introductions" && preview) {
    return `I read your introduction in ${roomName} — would love to connect when you have time.`;
  }
  if (preview) {
    return `I saw your post in ${roomName} and wanted to reach out.`;
  }
  return `I found you through ${roomName} and wanted to say hi.`;
}

export function roomPostUrl(roomSlug: string, postId: string): string {
  return `/rooms/${roomSlug}#post-${postId}`;
}
