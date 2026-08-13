import { createClient } from "@/lib/supabase";
import type { PostComment, Profile } from "@/lib/types";
import { normalizeProfile } from "@/lib/types";
import { emptyProfile } from "@/lib/profile";

export type PostCommentWithAuthor = PostComment & { author?: Profile };

export type CommentsLoadResult = {
  byPost: Record<string, PostCommentWithAuthor[]>;
  tableMissing: boolean;
};

export async function loadCommentsForPosts(postIds: string[]): Promise<CommentsLoadResult> {
  if (postIds.length === 0) return { byPost: {}, tableMissing: false };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("post_comments")
    .select("*")
    .in("post_id", postIds)
    .order("created_at", { ascending: true });

  if (error) {
    if (error.message.includes("post_comments") || error.code === "PGRST205") {
      return { byPost: {}, tableMissing: true };
    }
    return { byPost: {}, tableMissing: false };
  }

  const comments = (data ?? []) as PostComment[];
  const authorIds = [...new Set(comments.map((c) => c.author_id))];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, first_name")
    .in("id", authorIds);

  const profilesById: Record<string, Profile> = {};
  (profiles ?? []).forEach((row) => {
    profilesById[row.id] = normalizeProfile({ ...emptyProfile(row.id), ...row });
  });

  const byPost: Record<string, PostCommentWithAuthor[]> = {};
  comments.forEach((comment) => {
    const entry: PostCommentWithAuthor = {
      ...comment,
      author: profilesById[comment.author_id],
    };
    if (!byPost[comment.post_id]) byPost[comment.post_id] = [];
    byPost[comment.post_id].push(entry);
  });

  return { byPost, tableMissing: false };
}

export async function addPostComment(
  postId: string,
  authorId: string,
  body: string
): Promise<{ comment?: PostCommentWithAuthor; error?: string }> {
  const supabase = createClient();
  const trimmed = body.trim();
  if (!trimmed) return { error: "Write something first." };

  const { data, error } = await supabase
    .from("post_comments")
    .insert({ post_id: postId, author_id: authorId, body: trimmed })
    .select("*")
    .single();

  if (error) {
    if (error.message.includes("post_comments") || error.code === "PGRST205") {
      return {
        error:
          "Comments aren't set up yet. Run migration 007_post_comments.sql in Supabase (see supabase/RUN-PENDING-MIGRATIONS.md).",
      };
    }
    return { error: error.message };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, first_name")
    .eq("id", authorId)
    .single();

  return {
    comment: {
      ...(data as PostComment),
      author: profile
        ? normalizeProfile({ ...emptyProfile(authorId), ...profile })
        : undefined,
    },
  };
}

export async function deletePostComment(
  commentId: string,
  authorId: string
): Promise<{ error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("post_comments")
    .delete()
    .eq("id", commentId)
    .eq("author_id", authorId);

  if (error) return { error: error.message };
  return {};
}
