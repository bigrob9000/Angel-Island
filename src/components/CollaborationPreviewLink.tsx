"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProfileAttribution } from "@/components/ProfileAttribution";
import { createClient } from "@/lib/supabase";
import {
  collaborationFocusLine,
  collaborationQuietLine,
  collaborationStatusLabel,
  collaborationToneLine,
  updateCollaborationStatus,
  type CollaborationPreview,
} from "@/lib/collaborations";

type Props = {
  preview: CollaborationPreview;
  className?: string;
  showQuiet?: boolean;
  showActions?: boolean;
  onUpdated?: () => void;
};

export function CollaborationPreviewLink({
  preview,
  className = "",
  showQuiet = true,
  showActions = false,
  onUpdated,
}: Props) {
  const router = useRouter();
  const [acting, setActing] = useState(false);
  const tone = collaborationToneLine(preview.invite);
  const quietLine =
    showQuiet && preview.status !== "ended"
      ? collaborationQuietLine(preview.lastActivityAt)
      : null;

  const showActionRow =
    showActions &&
    (preview.status === "paused" || (preview.status === "active" && quietLine));

  async function changeStatus(status: "active" | "paused") {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (
      status === "paused" &&
      !window.confirm("Pause this collaboration? You can resume anytime — no explanation needed.")
    ) {
      return;
    }

    setActing(true);
    const result = await updateCollaborationStatus(
      preview.id,
      status,
      user.id,
      preview.chat_invite_id,
    );
    setActing(false);

    if (result.error) return;

    onUpdated?.();
    if (status === "active") {
      router.push(`/collaborations/${preview.id}`);
    }
  }

  return (
    <div
      className={`rounded-lg border border-foreground/10 bg-white/50 text-foreground ${className}`.trim()}
    >
      <Link
        href={`/collaborations/${preview.id}`}
        className="block px-4 py-3 transition-colors hover:bg-white/70 rounded-lg"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <ProfileAttribution profile={preview.other} className="font-medium" />
          <span className="text-xs text-muted">{collaborationStatusLabel(preview.status)}</span>
        </div>
        <p className="mt-2 text-sm text-foreground">{collaborationFocusLine(preview.invite)}</p>
        {tone && <p className="mt-1 text-sm text-muted">{tone}</p>}
        {quietLine && <p className="mt-2 text-xs text-muted italic">{quietLine}</p>}
        <p className="mt-2 text-xs text-muted">
          Last activity{" "}
          {new Date(preview.lastActivityAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </p>
      </Link>

      {showActionRow && (
        <div className="flex flex-wrap gap-2 border-t border-foreground/10 px-4 py-3">
          {preview.status === "paused" && (
            <button
              type="button"
              onClick={() => changeStatus("active")}
              disabled={acting}
              className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
            >
              Resume
            </button>
          )}
          {preview.status === "active" && quietLine && (
            <>
              <Link
                href={`/collaborations/${preview.id}`}
                className="rounded-md border border-foreground/30 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-foreground/5"
              >
                Pick back up
              </Link>
              <button
                type="button"
                onClick={() => changeStatus("paused")}
                disabled={acting}
                className="rounded-md border border-foreground/30 px-3 py-1.5 text-sm text-muted hover:text-foreground disabled:opacity-50"
              >
                Pause
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
