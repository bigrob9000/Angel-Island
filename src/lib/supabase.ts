import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "@/lib/supabase/config";

export function createClient() {
  const { supabaseUrl, anonKey } = getSupabaseConfig();
  return createBrowserClient(supabaseUrl, anonKey);
}
