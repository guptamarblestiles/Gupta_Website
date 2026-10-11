/** robots.txt — everything crawlable except /admin/* and filter/search/
 *  pagination query-string variants of /products and /tiles (those are
 *  noindex,follow in their own metadata too — see app/products/page.tsx
 *  and app/tiles/page.tsx — this just keeps crawl budget off them as
 *  well), plus a pointer to the sitemap. */
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/products?*", "/tiles?*"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
