import type { User } from "@supabase/supabase-js";

export const INVITE_COOKIE_NAME = "angel_island_invite";

/** When true, new accounts require an invite link (`?invite=1`). Sign-in always works. */
export function isInviteOnlyEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_INVITE_ONLY?.trim().toLowerCase();
  if (flag === "false" || flag === "0") return false;
  return true;
}

export function hasInviteAccess(searchParams: URLSearchParams | { get(name: string): string | null }): boolean {
  return searchParams.get("invite") === "1";
}

/** True when this looks like a brand-new account (first minutes after creation). */
export function isNewAuthUser(user: User): boolean {
  const created = new Date(user.created_at).getTime();
  const lastSignIn = new Date(user.last_sign_in_at ?? user.created_at).getTime();
  const ageMs = Date.now() - created;
  return ageMs < 5 * 60 * 1000 && Math.abs(lastSignIn - created) < 60 * 1000;
}

export function inviteRequiredMessage(): string {
  return "Angel Island is invite-only during beta. Use the invite link someone shared with you, or ask a member for one.";
}
