import "server-only";
import { revalidatePath } from "next/cache";
import type { PublicSync } from "@admin/lib/actionResult";
import { DEMO } from "@admin/lib/demo/mode";

/** Admin now lives in the same Next.js app as the public site, so this is
 *  always a same-origin relative path — no PUBLIC_SITE_URL needed. */
export function publicProductUrl(slug: string): string {
  return `/products/${encodeURIComponent(slug)}`;
}

/**
 * Drop the public site's cached pages after a change that affects them.
 *
 * Why this is needed: the public catalogue/product pages read Supabase on
 * every request, but the homepage (which lists PDF catalogues) and
 * sitemap.xml are prerendered at build time and would otherwise stay stale
 * until the next deploy. The call is cheap — pages re-render lazily on
 * their next visit — so it is made after every public-facing change.
 *
 * Admin and public site are the same Next.js app now, so this just calls
 * revalidatePath() in-process — no HTTP call, no shared secret, no
 * /api/revalidate route needed (that only existed for the two-app setup).
 *
 * Never throws: the database change has already succeeded by the time this
 * runs, so a failure here is reported to the user separately.
 */
export async function refreshPublicSite(): Promise<PublicSync> {
  if (DEMO) return "not_needed"; // a demo never touches the real website
  try {
    revalidatePath("/", "layout");
    return "refreshed";
  } catch {
    return "failed";
  }
}

export { syncNote } from "@admin/lib/actionResult";
