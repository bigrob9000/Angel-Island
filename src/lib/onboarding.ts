export const ONBOARDING_KEY = "angel_island_onboarding";

export function isOnboardingComplete(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ONBOARDING_KEY) === "done";
}
