import { createClient } from "@supabase/supabase-js";

// Anon-key client safe for browser-side use (Realtime subscriptions, etc.)
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
