export const SITE_NAME = "Angel Island";

export const SITE_DESCRIPTION =
  "A calm, consent-first platform for musicians to find each other, collaborate, and talk about music — without pressure, clout, or performance.";

export const SITE_TAGLINE = "A place for musicians and creatives";

/** Canonical public URL — set NEXT_PUBLIC_SITE_URL when using a custom domain. */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/^https?:\/\//, "")}`;
  }
  return "http://localhost:3000";
}
