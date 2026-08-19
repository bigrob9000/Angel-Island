import Link from "next/link";
import type { Profile } from "@/lib/types";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { isFullProfileComplete } from "@/lib/profile-completeness";

type ProfileCardProps = {
  profile: Profile;
  reason?: string;
  /** Show a subtle badge when the profile has all completeness fields filled. */
  showCompletenessBadge?: boolean;
};

function profileChips(profile: Profile): string[] {
  const chips = [
    ...profile.here_for.slice(0, 2),
    ...profile.roles.slice(0, 2),
    ...profile.genres_make.slice(0, 2),
  ];
  return [...new Set(chips)].slice(0, 4);
}

export function ProfileCard({ profile, reason, showCompletenessBadge = true }: ProfileCardProps) {
  const name = profile.first_name || profile.username;
  if (!name) return null;

  const fullProfile = showCompletenessBadge && isFullProfileComplete(profile);
  const excerpt =
    profile.about && profile.about.length > 100
      ? `${profile.about.slice(0, 100).trim()}…`
      : profile.about;
  const chips = profileChips(profile);

  const inner = (
    <>
      <div className="flex items-start gap-3">
        <ProfileAvatar profile={profile} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-foreground">{name}</p>
            {fullProfile && <span className="chip-muted">Complete</span>}
          </div>
          {profile.username && <p className="text-sm text-muted">@{profile.username}</p>}
          {profile.location && <p className="mt-0.5 text-sm text-muted">{profile.location}</p>}
        </div>
      </div>

      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <span key={chip} className="chip">
              {chip}
            </span>
          ))}
        </div>
      )}

      {excerpt && <p className="mt-3 text-sm text-muted leading-relaxed">{excerpt}</p>}
      {reason && <p className="mt-2 text-xs text-muted/90 italic">{reason}</p>}
      {!profile.username && (
        <p className="mt-2 text-xs text-muted">No username yet — profile link unavailable.</p>
      )}
    </>
  );

  if (!profile.username) {
    return <div className="surface px-4 py-4">{inner}</div>;
  }

  return (
    <Link href={`/people/${profile.username}`} className="surface-interactive block px-4 py-4 text-foreground">
      {inner}
    </Link>
  );
}
