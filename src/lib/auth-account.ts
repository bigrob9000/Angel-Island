import { getSiteUrl } from "@/lib/site";

/** Where Supabase sends email confirmation and email-change links. */
export function getAuthConfirmRedirectUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/auth/confirm`;
  }
  return `${getSiteUrl()}/auth/confirm`;
}

export function isValidEmailAddress(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function emailChangeErrorMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("already registered") || lower.includes("already been registered")) {
    return "That email is already in use on Angel Island.";
  }
  if (lower.includes("same as")) {
    return "That's already your email address.";
  }
  return message;
}
