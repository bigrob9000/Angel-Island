export const ONBOARDING_KEY = "angel_island_onboarding";

export function isOnboardingCompleteLocal(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ONBOARDING_KEY) === "done";
}

/** @deprecated Use isOnboardingCompleteLocal or profile.onboarding_complete. */
export function isOnboardingComplete(): boolean {
  return isOnboardingCompleteLocal();
}

export function markOnboardingCompleteLocal(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ONBOARDING_KEY, "done");
}

export function isOnboardingCompleteFromProfile(
  profile: { onboarding_complete?: boolean | null } | null | undefined,
): boolean {
  return profile?.onboarding_complete === true;
}

export function hasFinishedOnboarding(
  profile: { onboarding_complete?: boolean | null } | null | undefined,
): boolean {
  return isOnboardingCompleteFromProfile(profile) || isOnboardingCompleteLocal();
}
