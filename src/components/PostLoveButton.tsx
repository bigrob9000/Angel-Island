"use client";

import { useState } from "react";
import {
  loveCountLabel,
  postLovesSetupError,
  removePostLove,
  sendPostLove,
} from "@/lib/post-loves";

type Props = {
  postId: string;
  postAuthorId: string;
  userId: string | null;
  isOwn: boolean;
  loved: boolean;
  loveCount: number;
  interactionBlocked: boolean;
  tableMissing: boolean;
  onLovedChange: (postId: string, loved: boolean, loveCount: number) => void;
};

export function PostLoveButton({
  postId,
  postAuthorId,
  userId,
  isOwn,
  loved,
  loveCount,
  interactionBlocked,
  tableMissing,
  onLovedChange,
}: Props) {
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!userId) return null;

  async function toggleLove() {
    if (!userId || isOwn || interactionBlocked || acting) return;
    setActing(true);
    setError(null);

    const result = loved
      ? await removePostLove(postId, userId)
      : await sendPostLove(postId, postAuthorId, userId);

    setActing(false);

    if (result.tableMissing) {
      setError(postLovesSetupError());
      return;
    }
    if (result.error) {
      setError(result.error);
      return;
    }

    const nextLoved = !loved;
    const nextCount = Math.max(0, loveCount + (nextLoved ? 1 : -1));
    onLovedChange(postId, nextLoved, nextCount);
  }

  return (
    <div className="mt-3 border-t border-foreground/10 pt-3">
      {isOwn ? (
        <p className="text-sm text-muted">
          {loveCount > 0 ? (
            <>
              {loveCountLabel(loveCount)}
              <span className="italic"> · only you see this</span>
            </>
          ) : (
            <span className="italic">When someone sends love, only you will see it here.</span>
          )}
        </p>
      ) : (
        <div className="space-y-1">
          <button
            type="button"
            onClick={toggleLove}
            disabled={acting || interactionBlocked || tableMissing}
            className={`text-sm transition-colors disabled:opacity-50 ${
              loved
                ? "text-foreground font-medium"
                : "text-muted hover:text-foreground"
            }`}
            aria-pressed={loved}
          >
            {acting ? "…" : loved ? "Love sent" : "Send love"}
          </button>
          {tableMissing && (
            <p className="text-xs text-muted">{postLovesSetupError()}</p>
          )}
          {error && !tableMissing && (
            <p className="text-xs text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
