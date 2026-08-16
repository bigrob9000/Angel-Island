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

export function ProfileCard({ profile, reason, showCompletenessBadge = true }: ProfileCardProps) {
  const name = profile.first_name || profile.username;
  if (!name) return null;
  const fullProfile = showCompletenessBadge && isFullProfileComplete(profile);
  const excerpt =
    profile.about && profile.about.length > 120
      ? `${profile.about.slice(0, 120).trim()}…`
      : profile.about;
  const hereForPreview = profile.here_for.slice(0, 3).join(" · ");
  const openToPreview = profile.open_to.slice(0, 2).join(" · ");
  const genresMakePreview = profile.genres_make.slice(0, 3).join(", ");
  const genresLovePreview = profile.genres_love.slice(0, 3).join(", ");
  const collaboratePreview = profile.collaborate_as.slice(0, 2).join(", ");

  const inner = (
    <>
      <div className="flex items-start gap-3">
        <ProfileAvatar profile={profile} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-foreground">{name}</p>
            {fullProfile && (
              <span className="rounded-full border border-foreground/15 bg-foreground/5 px-2 py-0.5 text-xs text-muted">
                Complete profile
              </span>
            )}
          </div>
          {profile.username && <p className="text-sm text-muted">@{profile.username}</p>}
          {profile.location && <p className="mt-1 text-sm text-muted">{profile.location}</p>}
        </div>
      </div>
      {hereForPreview && (
        <p className="mt-2 text-sm text-foreground/90">
          Here for: {hereForPreview}
          {profile.here_for.length > 3 ? "…" : ""}
        </p>
      )}
      {openToPreview && (
        <p className="mt-2 text-sm text-foreground/90">
          Open to: {openToPreview}
          {profile.open_to.length > 2 ? "…" : ""}
        </p>
      )}
      {genresMakePreview && (
        <p className="mt-1 text-sm text-muted">
          Makes: {genresMakePreview}
          {profile.genres_make.length > 3 ? "…" : ""}
        </p>
      )}
      {genresLovePreview && (
        <p className="mt-1 text-sm text-muted">
          Loves: {genresLovePreview}
          {profile.genres_love.length > 3 ? "…" : ""}
        </p>
      )}
      {collaboratePreview && (
        <p className="mt-1 text-sm text-muted">
          Collaborates as: {collaboratePreview}
          {profile.collaborate_as.length > 2 ? "…" : ""}
        </p>
      )}
      {excerpt && <p className="mt-2 text-sm text-muted leading-relaxed">{excerpt}</p>}
      {reason && <p className="mt-2 text-xs text-muted italic">{reason}</p>}
      {!profile.username && (
        <p className="mt-2 text-xs text-muted">No username yet — profile link unavailable.</p>
      )}
    </>
  );

  if (!profile.username) {
    return (
      <div className="block rounded-lg border border-foreground/10 bg-white/50 px-4 py-3">
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={`/people/${profile.username}`}
      className="block rounded-lg border border-foreground/10 bg-white/50 px-4 py-3 text-foreground transition-colors hover:bg-white/70"
    >
      {inner}
    </Link>
  );
}
