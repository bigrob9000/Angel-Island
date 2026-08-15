/** Project origin only — not the /rest/v1 endpoint from the Supabase dashboard. */
export function normalizeSupabaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "").replace(/\/rest\/v1\/?$/i, "");
}

/** True when Vercel/local env has a real-looking Supabase project URL + anon key. */
export function isSupabaseConfigured(): boolean {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!rawUrl || !anonKey) return false;
  if (rawUrl.includes("xxx.supabase.co")) return false;
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(normalizeSupabaseUrl(rawUrl));
}

export function getSupabaseConfig() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to web/.env.local (or Vercel env vars), then restart/redeploy."
    );
  }

  const supabaseUrl = normalizeSupabaseUrl(rawUrl!);
  const trimmedUrl = rawUrl!.trim().replace(/\/+$/, "");
  if (supabaseUrl !== trimmedUrl) {
    console.warn(
      "NEXT_PUBLIC_SUPABASE_URL should be your project URL (https://xxx.supabase.co), not the /rest/v1 endpoint."
    );
  }

  return { supabaseUrl, anonKey: anonKey! };
}
