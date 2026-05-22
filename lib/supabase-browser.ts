import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Lazily created — returns null if the anon key is not configured,
// so missing env vars disable Realtime without crashing the app.
let _client: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient | null {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  _client = createClient(url, key);
  return _client;
}
