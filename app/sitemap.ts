/**
 * Dynamic sitemap.xml — static routes plus every product's detail page,
 * pulled live from Supabase rather than hardcoded (so it stays in sync as
 * products are added/removed via the admin panel). SITE_URL comes from
 * NEXT_PUBLIC_SITE_URL (set this once the site has a real domain on
 * Vercel); falls back to localhost for local builds.
 */
import type { MetadataRoute } from "next";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/tiles`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/visualizer`, changeFrequency: "monthly", priority: 0.6 },
  ];

  const client = getSupabaseServerClient();
  if (!client) return staticRoutes;

  // Page through in chunks rather than one unbounded select — Supabase caps
  // an unpaged select at 1000 rows, and the catalogue is already well past
  // half that, so this keeps the sitemap complete as it grows.
  const PAGE_SIZE = 1000;
  const rows: { slug: string; updated_at: string | null }[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data } = await client
      .from("products")
      .select("slug, updated_at")
      .eq("is_visible", true)
      .range(from, from + PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }

  const productRoutes: MetadataRoute.Sitemap = rows.map((p) => ({
    url: `${SITE_URL}/products/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...productRoutes];
}
