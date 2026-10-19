import "server-only";
import type { PublicSync } from "@/lib/actionResult";
import { DEMO } from "@/lib/demo/mode";

export const PUBLIC_SITE_URL = (process.env.PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

export function publicProductUrl(slug: string): string | null {
  return PUBLIC_SITE_URL ? `${PUBLIC_SITE_URL}/products/${encodeURIComponent(slug)}` : null;
}

/**
 * Ask the public site to drop its cached pages (POST /api/revalidate on the
 * public Next.js app, which calls revalidatePath("/", "layout")).
 *
 * Why this is needed: the public catalogue/product pages read Supabase on
 * every request, but the homepage (which lists PDF catalogues) and
 * sitemap.xml are prerendered at build time and would otherwise stay stale
 * until the next deploy. The call is cheap — pages re-render lazily on
 * their next visit — so it is made after every public-facing change.
 *
 * Never throws: the database change has already succeeded by the time this
 * runs, so a failure here is reported to the user separately.
 */
export async function refreshPublicSite(): Promise<PublicSync> {
  if (DEMO) return "not_needed"; // a demo never touches the real website
  const secret = process.env.PUBLIC_REVALIDATE_SECRET;
  if (!PUBLIC_SITE_URL || !secret) return "not_configured";
  try {
    const res = await fetch(`${PUBLIC_SITE_URL}/api/revalidate`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    return res.ok ? "refreshed" : "failed";
  } catch {
    return "failed";
  }
}

export { syncNote } from "@/lib/actionResult";
