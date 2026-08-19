import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, normalizeSupabaseUrl } from "@/lib/supabase/config";

/** Server-only Supabase client with service role — never import from client components. */
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!isSupabaseConfigured() || !serviceKey) {
    throw new Error("Supabase admin is not configured.");
  }

  return createClient(normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!), serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isNotificationEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM?.trim());
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() && isSupabaseConfigured());
}
