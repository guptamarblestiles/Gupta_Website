import { unstable_cache } from "next/cache";
import { getPublicSupabaseClient } from "@/lib/supabase/server";

export type Catalogue = {
  id: string;
  title: string;
  description: string | null;
  pdfUrl: string;
  thumbnailUrl: string | null;
};

async function fetchVisibleCatalogues(): Promise<Catalogue[]> {
  const client = getPublicSupabaseClient();
  if (!client) return []; // local dev without Supabase only (see getPublicSupabaseClient)

  const { data, error } = await client
    .from("catalogues")
    .select("id, title, description, pdf_url, thumbnail_url")
    .eq("is_visible", true)
    .order("sort_order", { ascending: true })
    .order("id");

  // Throw (never return []): unstable_cache doesn't store a thrown result, so
  // an outage can't be cached as "no catalogues" and ISR keeps the last good page.
  if (error) throw new Error(`Supabase catalogues query failed: ${error.code} ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    pdfUrl: row.pdf_url,
    thumbnailUrl: row.thumbnail_url,
  }));
}

const cachedVisibleCatalogues = unstable_cache(fetchVisibleCatalogues, ["catalogues:visible"], {
  revalidate: 3600,
  tags: ["catalogues"],
});

/** Only visible catalogues, in admin-defined order. Cached for an hour
 *  (tag "catalogues"); throws on a Supabase failure. */
export async function getVisibleCatalogues(): Promise<Catalogue[]> {
  return cachedVisibleCatalogues();
}
