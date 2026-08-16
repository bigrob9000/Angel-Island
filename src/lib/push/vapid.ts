/** VAPID keys for Web Push — server and public helpers. */

export function getVapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || null;
}

export function isPushConfigured(): boolean {
  return Boolean(
    getVapidPublicKey() &&
      process.env.VAPID_PRIVATE_KEY?.trim() &&
      process.env.VAPID_SUBJECT?.trim(),
  );
}

export function getVapidSubject(): string {
  const subject = process.env.VAPID_SUBJECT?.trim();
  if (!subject) {
    throw new Error("VAPID_SUBJECT is not configured.");
  }
  return subject;
}

export function getVapidPrivateKey(): string {
  const key = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!key) {
    throw new Error("VAPID_PRIVATE_KEY is not configured.");
  }
  return key;
}
