import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client for Server Actions / Route Handlers.
 * Returns null — not a thrown error — when the project isn't configured
 * yet (brief section 23: Supabase is installed but intentionally not
 * connected until real credentials exist), so callers degrade gracefully
 * instead of crashing. Once NEXT_PUBLIC_SUPABASE_URL and
 * NEXT_PUBLIC_SUPABASE_ANON_KEY are set (see .env.local.example), this
 * starts returning a real client with zero code changes elsewhere.
 */
export function getSupabaseServerClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return createClient(url, anonKey);
}
