/**
 * Dynamic sitemap.xml — static routes plus every product's detail page,
 * pulled live from Supabase rather than hardcoded (so it stays in sync as
 * products are added/removed via the admin panel). SITE_URL comes from
 * NEXT_PUBLIC_SITE_URL (set this once the site has a real domain on
 * Vercel); falls back to localhost for local builds.
 */
import type { MetadataRoute } from "next";
import { getSitemapProducts } from "@/lib/products/queries";
import { SITE_URL } from "@/lib/site";
import { COLLECTIONS } from "@/lib/collections";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/tiles`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/collections`, changeFrequency: "weekly", priority: 0.8 },
    ...COLLECTIONS.map((c) => ({
      url: `${SITE_URL}/collections/${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    { url: `${SITE_URL}/contact`, changeFrequency: "monthly", priority: 0.6 },
  ];

  // Throws on a Supabase failure (never publishes a product-less sitemap
  // during an outage); the listing is paged and cached in getSitemapProducts.
  const rows = await getSitemapProducts();

  const productRoutes: MetadataRoute.Sitemap = rows.map((p) => ({
    url: `${SITE_URL}/products/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...productRoutes];
}
