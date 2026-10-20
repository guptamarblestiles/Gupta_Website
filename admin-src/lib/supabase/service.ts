import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@admin/lib/env";
import { DEMO } from "@admin/lib/demo/mode";
import { createFakeClient } from "@admin/lib/demo/fakeSupabase";

/**
 * Service-role client. Bypasses RLS, so it is used for exactly one job:
 * Supabase's auth.admin API (creating a login for a new staff member),
 * and only after requireRole("owner") has passed. Granting the actual
 * admin role still goes through the user-scoped client and RLS.
 */
function realServiceClient(url: string, key: string) {
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function createServiceClient() {
  if (DEMO) return createFakeClient() as unknown as ReturnType<typeof realServiceClient>;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!SUPABASE_URL || !key) {
    throw new Error("SUPABASE_SECRET_KEY is not configured on the server.");
  }
  return realServiceClient(SUPABASE_URL, key);
}
