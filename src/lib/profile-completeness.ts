import type { Profile } from "@/lib/types";

export type ProfileCompletenessItem = {
  id: string;
  label: string;
  /** Shorter text for nudges and checklists. */
  shortLabel: string;
  href: string;
  done: boolean;
};

export type ProfileCompletenessProfile = Pick<
  Profile,
  "first_name" | "username" | "avatar_url" | "about" | "genres_make" | "roles" | "here_for"
>;

export function isDiscoverableProfileComplete(
  profile: Pick<Profile, "first_name" | "username">,
): boolean {
  return Boolean(profile.first_name?.trim() && profile.username?.trim());
}

export function getProfileCompleteness(profile: ProfileCompletenessProfile): {
  items: ProfileCompletenessItem[];
  completeCount: number;
  isComplete: boolean;
  percent: number;
} {
  const items: ProfileCompletenessItem[] = [
    {
      id: "basics",
      label: "Add your name and username",
      shortLabel: "Name and username",
      href: "/profile/edit?step=0",
      done: isDiscoverableProfileComplete(profile),
    },
    {
      id: "here_for",
      label: "Say what you're here for",
      shortLabel: "What you're here for",
      href: "/profile/edit?step=0",
      done: profile.here_for.length > 0,
    },
    {
      id: "photo",
      label: "Add a profile photo",
      shortLabel: "Profile photo",
      href: "/profile/edit?step=0",
      done: Boolean(profile.avatar_url?.trim()),
    },
    {
      id: "about",
      label: "Write a short bio",
      shortLabel: "Short bio",
      href: "/profile/edit?step=2",
      done: Boolean(profile.about?.trim()),
    },
    {
      id: "roles",
      label: "List your roles",
      shortLabel: "Roles",
      href: "/profile/edit?step=3",
      done: profile.roles.length > 0,
    },
    {
      id: "genres",
      label: "Add genres you make",
      shortLabel: "Genres you make",
      href: "/profile/edit?step=5",
      done: profile.genres_make.length > 0,
    },
  ];

  const completeCount = items.filter((item) => item.done).length;
  const isComplete = completeCount === items.length;
  return {
    items,
    completeCount,
    isComplete,
    percent: Math.round((completeCount / items.length) * 100),
  };
}

export function isFullProfileComplete(profile: ProfileCompletenessProfile): boolean {
  return getProfileCompleteness(profile).isComplete;
}

/** Optional polish items — excludes required basics. */
export function getOptionalProfileCompleteness(profile: ProfileCompletenessProfile): {
  items: ProfileCompletenessItem[];
  completeCount: number;
  isComplete: boolean;
  percent: number;
} {
  const full = getProfileCompleteness(profile);
  const items = full.items.filter((item) => item.id !== "basics");
  const completeCount = items.filter((item) => item.done).length;
  return {
    items,
    completeCount,
    isComplete: completeCount === items.length,
    percent: items.length === 0 ? 100 : Math.round((completeCount / items.length) * 100),
  };
}
