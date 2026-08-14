/** Project origin only — not the /rest/v1 endpoint from the Supabase dashboard. */
export function normalizeSupabaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "").replace(/\/rest\/v1\/?$/i, "");
}

export function getSupabaseConfig() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!rawUrl || !anonKey) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to web/.env.local, then stop and restart the dev server (npm run dev)."
    );
  }

  const supabaseUrl = normalizeSupabaseUrl(rawUrl);
  if (supabaseUrl !== rawUrl.trim().replace(/\/+$/, "")) {
    console.warn(
      "NEXT_PUBLIC_SUPABASE_URL should be your project URL (https://xxx.supabase.co), not the /rest/v1 endpoint."
    );
  }

  return { supabaseUrl, anonKey };
}
