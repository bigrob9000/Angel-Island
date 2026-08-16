import Link from "next/link";
import { ProfileAttribution } from "@/components/ProfileAttribution";
import {
  collaborationFocusLine,
  collaborationQuietLine,
  collaborationStatusLabel,
  collaborationToneLine,
  type CollaborationPreview,
} from "@/lib/collaborations";

type Props = {
  preview: CollaborationPreview;
  className?: string;
  showQuiet?: boolean;
};

export function CollaborationPreviewLink({
  preview,
  className = "",
  showQuiet = true,
}: Props) {
  const tone = collaborationToneLine(preview.invite);
  const quiet =
    showQuiet && preview.status === "active"
      ? collaborationQuietLine(preview.lastActivityAt)
      : null;

  return (
    <Link
      href={`/collaborations/${preview.id}`}
      className={`block rounded-lg border border-foreground/10 bg-white/50 px-4 py-3 text-foreground transition-colors hover:bg-white/70 ${className}`.trim()}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <ProfileAttribution profile={preview.other} className="font-medium" />
        <span className="text-xs text-muted">{collaborationStatusLabel(preview.status)}</span>
      </div>
      <p className="mt-2 text-sm text-foreground">{collaborationFocusLine(preview.invite)}</p>
      {tone && <p className="mt-1 text-sm text-muted">{tone}</p>}
      {quiet && <p className="mt-2 text-xs text-muted italic">{quiet}</p>}
      <p className="mt-2 text-xs text-muted">
        Last activity{" "}
        {new Date(preview.lastActivityAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })}
      </p>
    </Link>
  );
}
