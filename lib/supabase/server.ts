import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client for Server Components, Server Actions, and
 * Route Handlers. Returns null — not a thrown error — when the project
 * isn't configured, so callers (catalogue reads, the enquiry form) degrade
 * gracefully instead of crashing. Uses the publishable key (Supabase's
 * current replacement for the legacy "anon" key) deliberately, not the
 * secret key: every caller of this client only needs what RLS already
 * grants publicly (read products/product_images, insert enquiries), so
 * there's no reason to run with service-role-equivalent privileges.
 */
export function getSupabaseServerClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) return null;

  return createClient(url, publishableKey);
}
