"use client";

import { useState } from "react";
import type { PostCommentWithAuthor } from "@/lib/post-comments";
import { addPostComment, deletePostComment } from "@/lib/post-comments";
import { ProfileAttribution } from "@/components/ProfileAttribution";
import { UserSafetyActions } from "@/components/UserSafetyActions";

type Props = {
  postId: string;
  postAuthorId: string;
  userId: string | null;
  comments: PostCommentWithAuthor[];
  tableMissing?: boolean;
  /** Introductions: others welcome the author. Room: anyone can reply, including the author. */
  variant?: "introductions" | "room";
  onCommentsChange: (postId: string, comments: PostCommentWithAuthor[]) => void;
};

export function PostCommentSection({
  postId,
  postAuthorId,
  userId,
  comments,
  tableMissing,
  variant = "room",
  onCommentsChange,
}: Props) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isIntroductions = variant === "introductions";
  const canComment = userId && (isIntroductions ? userId !== postAuthorId : true);

  const placeholder = isIntroductions
    ? "A warm welcome or gentle question — no pressure."
    : "Add to the conversation — no pressure to be clever.";

  const authorNote = isIntroductions
    ? "Others can leave welcome comments here. You don't need to reply."
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !body.trim()) return;
    setSubmitting(true);
    setError(null);

    const result = await addPostComment(postId, userId, body);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.comment) {
      onCommentsChange(postId, [...comments, result.comment]);
      setBody("");
    }
  }

  async function handleDelete(commentId: string) {
    if (!userId) return;
    setDeletingId(commentId);
    setError(null);

    const result = await deletePostComment(commentId, userId);
    setDeletingId(null);

    if (result.error) {
      setError(result.error);
      return;
    }

    onCommentsChange(
      postId,
      comments.filter((c) => c.id !== commentId)
    );
  }

  return (
    <div className="mt-4 border-t border-foreground/10 pt-4">
      <p className="profile-section-label">Comments</p>

      {tableMissing ? (
        <p className="mt-2 text-sm text-muted">
          Comments will appear here once migration{" "}
          <code className="text-xs">007_post_comments.sql</code> is run in Supabase.
        </p>
      ) : (
        <>
          {comments.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No comments yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {comments.map((comment) => {
                const isOwn = comment.author_id === userId;
                return (
                  <li key={comment.id} className="text-sm">
                    <div className="flex flex-wrap items-baseline gap-2 text-xs text-muted">
                      <ProfileAttribution profile={comment.author} />
                      <span>
                        {new Date(comment.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="mt-1 text-muted whitespace-pre-wrap leading-relaxed">
                      {comment.body}
                    </p>
                    {isOwn ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(comment.id)}
                        disabled={deletingId === comment.id}
                        className="mt-1 text-xs text-muted hover:text-foreground disabled:opacity-50"
                      >
                        {deletingId === comment.id ? "Removing…" : "Remove"}
                      </button>
                    ) : userId ? (
                      <div className="mt-1">
                        <UserSafetyActions
                          currentUserId={userId}
                          reportedUserId={comment.author_id}
                          reportedUserName={
                            comment.author?.first_name ??
                            comment.author?.username ??
                            "this person"
                          }
                          targetType="comment"
                          targetId={comment.id}
                          showBlock
                          variant="links"
                        />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}

          {canComment ? (
            <form onSubmit={handleSubmit} className="mt-4 space-y-2">
              <label className="block">
                <span className="sr-only">Add a comment</span>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={2}
                  placeholder={placeholder}
                  className="block w-full rounded-md border border-foreground/20 bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-foreground/40 focus:outline-none"
                />
              </label>
              <button
                type="submit"
                disabled={submitting || !body.trim()}
                className="btn-secondary btn-sm"
              >
                {submitting ? "Posting…" : "Add comment"}
              </button>
            </form>
          ) : authorNote && userId === postAuthorId ? (
            <p className="mt-3 text-sm text-muted italic">{authorNote}</p>
          ) : null}
        </>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
