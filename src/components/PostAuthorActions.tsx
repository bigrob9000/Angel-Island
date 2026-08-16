import Link from "next/link";
import { buildProfileUrlFromRoom } from "@/lib/room-context";

type Props = {
  username: string;
  roomSlug: string;
  postId: string;
  isOwn: boolean;
  interactionBlocked?: boolean;
};

export function PostAuthorActions({
  username,
  roomSlug,
  postId,
  isOwn,
  interactionBlocked = false,
}: Props) {
  if (isOwn || interactionBlocked || !username.trim()) return null;

  const profileUrl = buildProfileUrlFromRoom(username, { roomSlug, postId });
  const inviteUrl = buildProfileUrlFromRoom(username, { roomSlug, postId }, { invite: true });

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      <Link href={profileUrl} className="text-foreground underline underline-offset-2 hover:no-underline">
        View profile
      </Link>
      <Link href={inviteUrl} className="text-muted hover:text-foreground">
        Invite to chat
      </Link>
    </div>
  );
}
