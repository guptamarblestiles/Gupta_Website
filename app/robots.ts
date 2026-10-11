/** robots.txt — everything crawlable except /admin/*, plus a pointer to
 *  the sitemap. */
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/admin/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
