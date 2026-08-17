/** Where to send someone after they sign in or finish OAuth. */
export function postAuthPath(
  profile: Pick<{ first_name?: string | null; username?: string | null }, "first_name" | "username"> | null,
): "/home" | "/onboarding" {
  const hasBasics = Boolean(profile?.first_name?.trim() && profile?.username?.trim());
  return hasBasics ? "/home" : "/onboarding";
}
