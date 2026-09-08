import { createClient } from "@/lib/supabase";
import { LISTEN_SLUG } from "@/lib/listen";
import { PROFILE_ATTRIBUTION_FIELDS } from "@/lib/profile";
import { emptyProfile } from "@/lib/profile";
import type { ProfileListenShare } from "@/lib/profile-shares";
import type { Profile } from "@/lib/types";
import { normalizeProfile } from "@/lib/types";

export type ListenShareFeedEntry = {
  share: ProfileListenShare;
  author: Pick<Profile, "id" | "first_name" | "username" | "avatar_url">;
};

export async function loadListenShareFeed(options?: {
  limit?: number;
  excludeAuthorIds?: Set<string>;
}): Promise<ListenShareFeedEntry[]> {
  const limit = options?.limit ?? 5;
  const exclude = options?.excludeAuthorIds ?? new Set<string>();
  const supabase = createClient();

  const { data: room } = await supabase
    .from("rooms")
    .select("id")
    .eq("slug", LISTEN_SLUG)
    .maybeSingle();

  if (!room?.id) return [];

  const fetchLimit = limit + exclude.size + 8;
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, title, body, media_url, created_at, intent, author_id")
    .eq("room_id", room.id)
    .eq("intent", "share_work")
    .order("created_at", { ascending: false })
    .limit(fetchLimit);

  if (error || !posts?.length) return [];

  const visible = posts.filter((post) => !exclude.has(post.author_id)).slice(0, limit);
  if (visible.length === 0) return [];

  const authorIds = [...new Set(visible.map((post) => post.author_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select(PROFILE_ATTRIBUTION_FIELDS)
    .in("id", authorIds);

  const byId: Record<string, Pick<Profile, "id" | "first_name" | "username" | "avatar_url">> = {};
  (profiles ?? []).forEach((row) => {
    const profile = normalizeProfile({ ...emptyProfile(row.id), ...row } as Profile);
    byId[row.id] = {
      id: profile.id,
      first_name: profile.first_name,
      username: profile.username,
      avatar_url: profile.avatar_url,
    };
  });

  return visible.map((post) => ({
    share: {
      id: post.id,
      title: post.title,
      body: post.body,
      media_url: post.media_url,
      created_at: post.created_at,
      intent: post.intent,
    } as ProfileListenShare,
    author: byId[post.author_id] ?? {
      id: post.author_id,
      first_name: null,
      username: null,
      avatar_url: null,
    },
  }));
}
