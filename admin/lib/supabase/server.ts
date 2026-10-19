import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";
import { DEMO } from "@/lib/demo/mode";
import { createFakeClient } from "@/lib/demo/fakeSupabase";

function userClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // proxy.ts refreshes the session cookie on every request instead.
        }
      },
    },
  });
}

/**
 * Supabase client acting AS the signed-in user (publishable key + their
 * session cookie). Every query is subject to RLS, so a viewer simply cannot
 * write, whatever the UI does. This is the client almost all admin code uses.
 * In local demo mode it is an in-memory stand-in (lib/demo).
 */
export async function createClient(): Promise<ReturnType<typeof userClient>> {
  const cookieStore = await cookies();
  if (DEMO) return createFakeClient() as unknown as ReturnType<typeof userClient>;
  return userClient(cookieStore);
}
