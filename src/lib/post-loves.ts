import { createClient } from "@/lib/supabase";
import type { Post } from "@/lib/types";
import { checkBlockBetween } from "@/lib/blocks";

export type PostLoveState = {
  lovedPostIds: Set<string>;
  loveCountByPost: Record<string, number>;
  tableMissing: boolean;
};

function isLovesTableMissing(message: string, code?: string): boolean {
  return message.includes("post_loves") || code === "PGRST205";
}

export function postLovesSetupError(): string {
  return "Private love isn't set up yet. Run migration 015_post_loves.sql in Supabase (see supabase/RUN-PENDING-MIGRATIONS.md).";
}

export async function loadPostLoveState(
  posts: Post[],
  userId: string | null
): Promise<PostLoveState> {
  if (!userId || posts.length === 0) {
    return { lovedPostIds: new Set(), loveCountByPost: {}, tableMissing: false };
  }

  const supabase = createClient();
  const postIds = posts.map((post) => post.id);
  const myPostIds = new Set(
    posts.filter((post) => post.author_id === userId).map((post) => post.id)
  );

  const { data, error } = await supabase
    .from("post_loves")
    .select("post_id, user_id")
    .in("post_id", postIds);

  if (error) {
    if (isLovesTableMissing(error.message, error.code)) {
      return { lovedPostIds: new Set(), loveCountByPost: {}, tableMissing: true };
    }
    return { lovedPostIds: new Set(), loveCountByPost: {}, tableMissing: false };
  }

  const lovedPostIds = new Set<string>();
  const loveCountByPost: Record<string, number> = {};

  (data ?? []).forEach((row) => {
    if (row.user_id === userId) {
      lovedPostIds.add(row.post_id);
    }
    if (myPostIds.has(row.post_id)) {
      loveCountByPost[row.post_id] = (loveCountByPost[row.post_id] ?? 0) + 1;
    }
  });

  return { lovedPostIds, loveCountByPost, tableMissing: false };
}

export async function sendPostLove(
  postId: string,
  postAuthorId: string,
  userId: string
): Promise<{ error?: string; tableMissing?: boolean }> {
  const block = await checkBlockBetween(userId, postAuthorId);
  if (block.blockedByMe || block.blockedByThem) {
    return { error: "You can't send love on this post." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("post_loves").insert({
    post_id: postId,
    user_id: userId,
  });

  if (error) {
    if (isLovesTableMissing(error.message, error.code)) {
      return { tableMissing: true, error: postLovesSetupError() };
    }
    return { error: error.message };
  }

  return {};
}

export async function removePostLove(
  postId: string,
  userId: string
): Promise<{ error?: string; tableMissing?: boolean }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("post_loves")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", userId);

  if (error) {
    if (isLovesTableMissing(error.message, error.code)) {
      return { tableMissing: true, error: postLovesSetupError() };
    }
    return { error: error.message };
  }

  return {};
}

export function loveCountLabel(count: number): string {
  if (count === 1) return "1 person sent love";
  return `${count} people sent love`;
}
