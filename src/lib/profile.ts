import type { Profile } from "@/lib/types";
import { normalizeProfile } from "@/lib/types";

export function emptyProfile(id: string): Profile {
  return normalizeProfile({ id });
}

/** Fields for name + avatar in posts, comments, and messages. */
export const PROFILE_ATTRIBUTION_FIELDS = "id, username, first_name, avatar_url";

/** Profiles need a first name and @username before showing in Explore, Search, or Home. */
export function isDiscoverableProfile(
  profile: Pick<Profile, "first_name" | "username">
): boolean {
  return Boolean(profile.first_name?.trim() && profile.username?.trim());
}

export type ProfileFormState = Omit<
  Profile,
  "id" | "updated_at" | "notify_email_messages" | "notify_email_collab" | "notify_push_collab" | "onboarding_complete"
>;

export function profileToForm(profile: Profile): ProfileFormState {
  return {
    username: profile.username,
    first_name: profile.first_name,
    pronouns: profile.pronouns,
    location: profile.location,
    about: profile.about,
    here_for: profile.here_for,
    open_to: profile.open_to,
    roles: profile.roles,
    collaborate_as: profile.collaborate_as,
    genres_make: profile.genres_make,
    genres_love: profile.genres_love,
    working_style: profile.working_style,
    open_to_questions: profile.open_to_questions,
    work_links: profile.work_links,
    avatar_url: profile.avatar_url,
  };
}

export function buildProfileRow(id: string, form: ProfileFormState) {
  return {
    id,
    first_name: form.first_name?.trim() || null,
    username: form.username?.trim().toLowerCase() || null,
    pronouns: form.pronouns?.trim() || null,
    location: form.location?.trim() || null,
    about: form.about?.trim() || null,
    here_for: form.here_for,
    open_to: form.open_to,
    roles: form.roles,
    collaborate_as: form.collaborate_as.slice(0, 2),
    genres_make: form.genres_make.slice(0, 5),
    genres_love: form.genres_love,
    working_style: form.working_style,
    open_to_questions: form.open_to_questions,
    work_links: form.work_links?.trim() || null,
    avatar_url: form.avatar_url?.trim() || null,
    updated_at: new Date().toISOString(),
  };
}
