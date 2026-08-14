import Link from "next/link";
import type { Profile } from "@/lib/types";
import { ProfileAvatar } from "@/components/ProfileAvatar";

type ProfileLike = Pick<Profile, "first_name" | "username" | "avatar_url"> | null | undefined;

type Props = {
  profile: ProfileLike;
  className?: string;
};

export function ProfileAttribution({ profile, className = "" }: Props) {
  const first = profile?.first_name?.trim();
  const user = profile?.username?.trim();

  if (!first && !user) {
    return <span className={className}>Someone</span>;
  }

  const label = (
    <span className="inline-flex items-center gap-2">
      <ProfileAvatar profile={profile ?? {}} size="sm" />
      <span>
        {first && <span>{first}</span>}
        {first && user && <span className="text-muted"> · </span>}
        {user && (
          <span className={first ? "text-muted" : undefined}>@{user}</span>
        )}
      </span>
    </span>
  );

  if (user) {
    return (
      <Link
        href={`/people/${user}`}
        className={`text-foreground hover:underline ${className}`.trim()}
      >
        {label}
      </Link>
    );
  }

  return <span className={className}>{label}</span>;
}
