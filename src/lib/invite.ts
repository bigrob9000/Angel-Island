import { getSiteUrl } from "@/lib/site";
import { INVITE_COOKIE_NAME } from "@/lib/invite-gate";

/** Public invite link — lands on the welcome page first. */
export const INVITE_LANDING_PATH = "/?invite=1";

/** After reading the welcome page, continue to sign-up. */
export const INVITE_SIGN_UP_PATH = "/sign-in?invite=1&mode=sign-up&enter=1";

/** @deprecated Use INVITE_LANDING_PATH — kept for any stale references. */
export const INVITE_SIGN_IN_PATH = INVITE_LANDING_PATH;

export function getInviteSignInUrl(origin?: string): string {
  const base = (origin ?? getSiteUrl()).replace(/\/$/, "");
  return `${base}${INVITE_LANDING_PATH}`;
}

export function getInviteSignUpPath(): string {
  return INVITE_SIGN_UP_PATH;
}

export const INVITE_MESSAGE_TEMPLATE = `Hey — I'm trying out Angel Island, a calm space for musicians to find each other and collaborate (no clout, no pressure). Would you join me and tell me what you think?

`;

/** Remember invite acceptance for OAuth (7 days). Call when `?invite=1` is present. */
export function persistInviteAcceptance(): void {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 7;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${INVITE_COOKIE_NAME}=1; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
}
