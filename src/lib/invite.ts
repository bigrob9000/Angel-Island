import { getSiteUrl } from "@/lib/site";

export const INVITE_SIGN_IN_PATH = "/sign-in?invite=1&mode=sign-up";

export function getInviteSignInUrl(origin?: string): string {
  const base = (origin ?? getSiteUrl()).replace(/\/$/, "");
  return `${base}${INVITE_SIGN_IN_PATH}`;
}

export const INVITE_MESSAGE_TEMPLATE = `Hey — I'm trying out Angel Island, a calm space for musicians to find each other and collaborate (no clout, no pressure). Would you join me and tell me what you think?

`;
