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
      <section className="rounded-lg border border-foreground/10 bg-white/50 p-5">
        <h2 className="font-serif text-lg font-medium text-foreground">From Listen & Share</h2>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          Want to share a clip or demo? Listen & Share is the place — your profile can show your
          recent shares here.
        </p>
        <Link
          href="/rooms/listen?compose=share_work"
          className="mt-4 inline-block rounded-md border border-foreground/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
        >
          Share something in Listen & Share
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-foreground/10 bg-white/50 p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-serif text-lg font-medium text-foreground">From Listen & Share</h2>
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
                className="block rounded-lg border border-foreground/10 bg-white/60 px-4 py-3 hover:bg-white/80"
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
