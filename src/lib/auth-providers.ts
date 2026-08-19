import type { User } from "@supabase/supabase-js";

export function userHasEmailPassword(user: User): boolean {
  return user.identities?.some((identity) => identity.provider === "email") ?? false;
}

export function userHasGoogle(user: User): boolean {
  return user.identities?.some((identity) => identity.provider === "google") ?? false;
}
