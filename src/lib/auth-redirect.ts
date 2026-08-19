/** Where to send someone after they sign in or finish OAuth. */
export function postAuthPath(
  profile:
    | Pick<
        { onboarding_complete?: boolean | null; first_name?: string | null; username?: string | null },
        "onboarding_complete" | "first_name" | "username"
      >
    | null,
): "/home" | "/onboarding" {
  if (profile?.onboarding_complete) return "/home";

  const hasBasics = Boolean(profile?.first_name?.trim() && profile?.username?.trim());
  if (hasBasics) return "/home";

  return "/onboarding";
}
