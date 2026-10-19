/**
 * Called by the separate admin app (admin/lib/publicSite.ts) after it
 * changes anything customers can see, so pages that were prerendered at
 * build time — the homepage's catalogue section and sitemap.xml — pick up
 * the change without a redeploy. Catalogue and product pages already read
 * Supabase on every request; this just keeps the static ones in step.
 *
 * Marks the whole site stale; each page re-renders on its next visit, so a
 * call costs nothing up front. Protected by a shared secret
 * (REVALIDATE_SECRET here = PUBLIC_REVALIDATE_SECRET in the admin app).
 */
import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return Response.json({ error: "Revalidation is not configured." }, { status: 503 });
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const given = Buffer.from(token);
  const expected = Buffer.from(secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidatePath("/", "layout");
  return Response.json({ revalidated: true, at: new Date().toISOString() });
}
