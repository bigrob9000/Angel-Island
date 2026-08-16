import type { Profile } from "@/lib/types";

export type ProfileCompletenessItem = {
  id: string;
  label: string;
  href: string;
  done: boolean;
};

export function getProfileCompleteness(profile: Pick<
  Profile,
  "avatar_url" | "about" | "genres_make" | "roles"
>): {
  items: ProfileCompletenessItem[];
  completeCount: number;
  isComplete: boolean;
} {
  const items: ProfileCompletenessItem[] = [
    {
      id: "photo",
      label: "Add a photo",
      href: "/profile",
      done: Boolean(profile.avatar_url?.trim()),
    },
    {
      id: "about",
      label: "Write a short about",
      href: "/profile/edit",
      done: Boolean(profile.about?.trim()),
    },
    {
      id: "genres",
      label: "Share what you make",
      href: "/profile/edit",
      done: profile.genres_make.length > 0,
    },
    {
      id: "roles",
      label: "Add your roles",
      href: "/profile/edit",
      done: profile.roles.length > 0,
    },
  ];

  const completeCount = items.filter((item) => item.done).length;
  return {
    items,
    completeCount,
    isComplete: completeCount === items.length,
  };
}
