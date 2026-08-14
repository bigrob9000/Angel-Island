import { createClient } from "@/lib/supabase";
import type { Post } from "@/lib/types";
import { LISTEN_SLUG } from "@/lib/listen";

export type ProfileListenShare = Pick<
  Post,
  "id" | "title" | "body" | "media_url" | "created_at" | "intent"
>;

export async function loadRecentListenShares(
  authorId: string,
  limit = 2
): Promise<ProfileListenShare[]> {
  const supabase = createClient();

  const { data: room } = await supabase
    .from("rooms")
    .select("id")
    .eq("slug", LISTEN_SLUG)
    .maybeSingle();

  if (!room?.id) return [];

  const { data, error } = await supabase
    .from("posts")
    .select("id, title, body, media_url, created_at, intent")
    .eq("room_id", room.id)
    .eq("author_id", authorId)
    .eq("intent", "share_work")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as ProfileListenShare[];
}

export function listenShareHref(postId: string): string {
  return `/rooms/${LISTEN_SLUG}#post-${postId}`;
}

export function listenSharePreview(share: ProfileListenShare): string {
  const title = share.title?.trim();
  if (title) return title;
  const body = share.body.trim();
  if (body) return body.length > 100 ? `${body.slice(0, 100).trim()}…` : body;
  return "Shared work";
}
