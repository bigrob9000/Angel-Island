import Link from "next/link";
import { roomPostUrl } from "@/lib/room-context";

type Props = {
  roomName: string;
  roomSlug: string;
  postId?: string;
  postPreview?: string | null;
  authorName: string;
};

export function RoomDiscoveryBanner({
  roomName,
  roomSlug,
  postId,
  postPreview,
  authorName,
}: Props) {
  const roomLink = postId ? roomPostUrl(roomSlug, postId) : `/rooms/${roomSlug}`;

  return (
    <section className="surface p-4">
      <p className="text-sm text-muted">You found {authorName} in a room</p>
      <p className="mt-1 text-sm text-foreground">
        <Link href={roomLink} className="underline underline-offset-2 hover:no-underline">
          {roomName}
        </Link>
        {postPreview ? ` — “${postPreview}”` : ""}
      </p>
      <p className="mt-2 text-sm text-muted">
        Read their profile, then invite them to chat if it feels right. No cold DMs.
      </p>
    </section>
  );
}
