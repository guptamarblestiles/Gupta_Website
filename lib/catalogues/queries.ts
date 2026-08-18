import { getSupabaseServerClient } from "@/lib/supabase/server";

export type Catalogue = {
  id: string;
  title: string;
  description: string | null;
  pdfUrl: string;
  thumbnailUrl: string | null;
};

/** Only visible catalogues, in admin-defined order. Returns an empty array
 *  (never throws) when Supabase isn't configured or the query fails, so a
 *  missing/misconfigured catalogue feature never takes down the homepage —
 *  the section simply doesn't render (see CatalogueSection). */
export async function getVisibleCatalogues(): Promise<Catalogue[]> {
  const client = getSupabaseServerClient();
  if (!client) return [];

  const { data, error } = await client
    .from("catalogues")
    .select("id, title, description, pdf_url, thumbnail_url")
    .eq("is_visible", true)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    pdfUrl: row.pdf_url,
    thumbnailUrl: row.thumbnail_url,
  }));
}
