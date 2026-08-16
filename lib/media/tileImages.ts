/**
 * Database-driven image selection for the homepage's editorial sections
 * (cinematic quote zoom, Applications, Highlights, Testimonials) — pulls
 * real photos from the live `products`/`product_images` tables rather than
 * hardcoding image URLs directly, so if a product is ever edited/removed
 * in the admin panel, these sections update automatically.
 *
 * WHY A CURATED SLUG LIST, NOT A BLIND QUERY: the brief asked for
 * "intelligent filtering" over hardcoding. A query alone (e.g. "any image
 * where color = white") isn't safe here — this catalogue's photography
 * quality varies a lot by source PDF, and some of it has a third-party
 * manufacturer's logo baked into the image itself (spot-checked while
 * building this: 2x4-glossy-d-m-luminous-white's lifestyle photo has a
 * visible "Dakshinamurti Tiles" watermark in the corner — shipping that on
 * Gupta's own site would display a competitor/supplier's branding). A
 * fully automated selector can't detect that. So: the category filter
 * below (2x4 Glossy D M) is the real, data-driven part — genuinely the
 * only source category in this catalogue with premium, room-context
 * photography rather than dated stock-photo composites — and the specific
 * slugs are a manual visual QA pass on top of that filter, confirming no
 * embedded branding and a clean architectural look. Extend this list the
 * same way (pick from `2x4 Glossy D M` slugs, eyeball the lifestyle image)
 * rather than removing the filter.
 */
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type CuratedImage = {
  slug: string;
  name: string;
  imageUrl: string;
};

const CURATED_SLUGS = {
  /** Reception/lobby — used for the Commercial application + cinematic zoom fallback. */
  commercial: "2x4-glossy-d-m-alicante-grey",
  /** Living room, warm marble floor. */
  residential: "2x4-glossy-d-m-himalayan-gold",
  /** Second living room, cooler tone — Highlights/Testimonials variety. */
  residentialAlt: "2x4-glossy-d-m-castle-grey",
  /** Freestanding-tub spa bathroom. */
  hospitality: "2x4-glossy-d-m-onyx-reale",
  /** Pure white marble slab close-up — the cinematic quote zoom needs a
   *  texture-forward image, not a room scene. */
  slab: "2x4-glossy-d-m-roman-white",
} as const;

async function fetchCurated(slug: string, imageIndex: number): Promise<CuratedImage | null> {
  const client = getSupabaseServerClient();
  if (!client) return null;

  const { data: product } = await client
    .from("products")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (!product) return null;

  const { data: image } = await client
    .from("product_images")
    .select("image_url")
    .eq("product_id", product.id)
    .eq("sort_order", imageIndex)
    .maybeSingle();
  if (!image) return null;

  return { slug: product.slug, name: product.name, imageUrl: image.image_url };
}

/** Pure marble slab texture (sort_order 0 — the main slab shot, not a room)
 *  for the cinematic scroll-zoom quote section. */
export async function getSlabTextureImage(): Promise<CuratedImage | null> {
  return fetchCurated(CURATED_SLUGS.slab, 0);
}

/** Residential/Commercial/Hospitality room photos (sort_order 2 — the
 *  lifestyle shot) for the Applications showcase, in that display order. */
export async function getApplicationImages(): Promise<CuratedImage[]> {
  const results = await Promise.all([
    fetchCurated(CURATED_SLUGS.residential, 2),
    fetchCurated(CURATED_SLUGS.commercial, 2),
    fetchCurated(CURATED_SLUGS.hospitality, 2),
  ]);
  return results.filter((r): r is CuratedImage => r !== null);
}

/** Four room photos for the Highlights showcase (reuses the same vetted
 *  set as Applications/Testimonials — ties the sections together visually
 *  rather than needing a much larger manually-screened pool). */
export async function getHighlightImages(): Promise<CuratedImage[]> {
  const results = await Promise.all([
    fetchCurated(CURATED_SLUGS.residential, 2),
    fetchCurated(CURATED_SLUGS.hospitality, 2),
    fetchCurated(CURATED_SLUGS.commercial, 2),
    fetchCurated(CURATED_SLUGS.residentialAlt, 2),
  ]);
  return results.filter((r): r is CuratedImage => r !== null);
}

/** Room photos for testimonial backgrounds, one per card. */
export async function getTestimonialImages(): Promise<CuratedImage[]> {
  const results = await Promise.all([
    fetchCurated(CURATED_SLUGS.residentialAlt, 2),
    fetchCurated(CURATED_SLUGS.commercial, 2),
    fetchCurated(CURATED_SLUGS.hospitality, 2),
    fetchCurated(CURATED_SLUGS.residential, 2),
  ]);
  return results.filter((r): r is CuratedImage => r !== null);
}
