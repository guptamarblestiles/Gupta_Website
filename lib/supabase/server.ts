import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase config shared by the server-side clients. The publishable key is
 * Supabase's current replacement for the legacy "anon" key; the legacy
 * NEXT_PUBLIC_SUPABASE_ANON_KEY name is accepted as an alias so a naming
 * mismatch between environments can never silently fall back to fake data.
 */
function readConfig(): { url?: string; key?: string } {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || undefined,
    key:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      undefined,
  };
}

/** The in-memory mock catalogue is for local dev/test only. Any production
 *  deployment (Vercel production or NODE_ENV=production) must never serve it. */
export function isMockDataAllowed(): boolean {
  return process.env.VERCEL_ENV !== "production" && process.env.NODE_ENV !== "production";
}

/**
 * Server-side Supabase client for Server Actions and Route Handlers that
 * degrade gracefully (the enquiry form). Returns null — not a thrown error —
 * when the project isn't configured. Uses the publishable key deliberately,
 * not the secret key: callers only need what RLS already grants publicly.
 */
export function getSupabaseServerClient(): SupabaseClient | null {
  const { url, key } = readConfig();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * Client for public catalogue reads. Deliberately cookie-less (no cookies() /
 * headers()) so it is safe to call inside unstable_cache, which forbids
 * dynamic request APIs.
 *
 * Missing config: returns null in local dev/test (callers then use the mock
 * dataset) but THROWS in production, naming the missing variables, so a
 * misconfigured deploy fails loudly instead of publishing fake products.
 */
export function getPublicSupabaseClient(): SupabaseClient | null {
  const { url, key } = readConfig();
  if (url && key) {
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  if (isMockDataAllowed()) return null;

  const missing = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !key && "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or legacy NEXT_PUBLIC_SUPABASE_ANON_KEY)",
  ].filter(Boolean);
  throw new Error(`Supabase is not configured in production: missing ${missing.join(" and ")}`);
}
