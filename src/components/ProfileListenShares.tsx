import Link from "next/link";
import type { ProfileListenShare } from "@/lib/profile-shares";
import { listenShareHref, listenSharePreview } from "@/lib/profile-shares";

type Props = {
  shares: ProfileListenShare[];
  isOwn?: boolean;
  showPrompt?: boolean;
};

export function ProfileListenShares({ shares, isOwn = false, showPrompt = false }: Props) {
  if (shares.length === 0) {
    if (!isOwn || !showPrompt) return null;

    return (
      <section className="surface p-5">
        <h2 className="section-heading">From Listen & Share</h2>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          Want to share a clip or demo? Listen & Share is the place — your profile can show your
          recent shares here.
        </p>
        <Link href="/rooms/listen?compose=share_work" className="btn-secondary mt-4 inline-flex">
          Share something in Listen & Share
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-foreground/10 bg-white/50 p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="section-heading">From Listen & Share</h2>
        <Link href="/rooms/listen" className="text-sm text-muted hover:text-foreground shrink-0">
          Visit room
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted">
        Recent clips and demos {isOwn ? "you've shared" : "they've shared"} publicly in Listen & Share.
      </p>
      <ul className="mt-4 space-y-3">
        {shares.map((share) => {
          const when = new Date(share.created_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          return (
            <li key={share.id}>
              <Link
                href={listenShareHref(share.id)}
                className="surface-interactive block px-4 py-3"
              >
                <p className="font-medium text-foreground">{listenSharePreview(share)}</p>
                <p className="mt-1 text-sm text-muted">
                  Listen & Share · {when}
                  {share.media_url ? " · Audio or video link" : ""}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
