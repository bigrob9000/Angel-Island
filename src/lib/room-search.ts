import type { Post, PostIntent, Profile } from "@/lib/types";
import { POST_INTENT_LABELS } from "@/lib/types";

export type RoomSearchGroup = {
  title: string;
  posts: Post[];
};

function postIntentSearchLabel(post: Post, isIntroductions: boolean): string {
  if (isIntroductions) return "introduction";
  return POST_INTENT_LABELS[post.intent].toLowerCase();
}

function postSearchHaystack(
  post: Post,
  profile: Profile | undefined,
  isIntroductions: boolean
): string {
  return [
    post.title,
    post.body,
    postIntentSearchLabel(post, isIntroductions),
    profile?.first_name,
    profile?.username,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function searchRoomPosts(
  posts: Post[],
  profiles: Record<string, Profile>,
  query: string,
  isIntroductions: boolean
): Post[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return posts;

  return posts.filter((post) =>
    postSearchHaystack(post, profiles[post.author_id], isIntroductions).includes(needle)
  );
}

const GROUPS_GENERAL: Array<{ intent: PostIntent; title: string }> = [
  { intent: "conversation", title: "Recent conversations" },
  { intent: "question", title: "Questions" },
  { intent: "collab_invite", title: "Collaboration posts" },
  { intent: "idea", title: "Ideas" },
  { intent: "share_work", title: "Shared work" },
];

const GROUPS_LISTEN: Array<{ intent: PostIntent; title: string }> = [
  { intent: "share_work", title: "Shared work" },
  { intent: "question", title: "Questions" },
  { intent: "collab_invite", title: "Collaboration posts" },
  { intent: "conversation", title: "Recent conversations" },
  { intent: "idea", title: "Ideas" },
];

function sortPostsNewestFirst(posts: Post[]): Post[] {
  return [...posts].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function groupRoomSearchResults(
  posts: Post[],
  options: { isIntroductions: boolean; isListen: boolean }
): RoomSearchGroup[] {
  if (posts.length === 0) return [];

  if (options.isIntroductions) {
    return [{ title: "Introductions", posts: sortPostsNewestFirst(posts) }];
  }

  const byIntent = new Map<PostIntent, Post[]>();
  posts.forEach((post) => {
    const list = byIntent.get(post.intent) ?? [];
    list.push(post);
    byIntent.set(post.intent, list);
  });

  const order = options.isListen ? GROUPS_LISTEN : GROUPS_GENERAL;

  return order
    .map(({ intent, title }) => ({
      title,
      posts: sortPostsNewestFirst(byIntent.get(intent) ?? []),
    }))
    .filter((group) => group.posts.length > 0);
}

export function roomSearchPreview(post: Post): string {
  const title = post.title?.trim();
  if (title) return title;
  const body = post.body.trim();
  if (!body) return "Untitled post";
  return body.length > 120 ? `${body.slice(0, 120).trim()}…` : body;
}

export function formatRoomPostTime(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
