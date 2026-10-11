import type { Metadata } from "next";
import { FILTER_KEYS } from "@/types/product";

/** Query params that mark a /products or /tiles URL as a filtered, search,
 *  or paginated variant of the clean catalogue page — used to decide
 *  canonical + indexing for those pages. "page" only counts past page 1;
 *  Next.js passes searchParams with page 1 both as "1" and as an absent
 *  key depending on how the link was built, so compare the string value. */
const SEARCH_PARAM_KEYS = [...FILTER_KEYS, "q"] as const;

type SearchParams = Record<string, string | string[] | undefined>;

export function isFilteredCatalogueView(params: SearchParams): boolean {
  const hasFilterOrSearch = SEARCH_PARAM_KEYS.some((key) => {
    const value = params[key];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  });
  const page = params.page;
  const hasPage = Array.isArray(page) ? page.some((p) => p !== "1") : Boolean(page) && page !== "1";
  return hasFilterOrSearch || hasPage;
}

/** Builds the canonical/robots portion of a catalogue page's metadata.
 *  Clean views (no filter/search/page params) get a self-referencing
 *  canonical and normal indexing; filtered/search/paginated views get
 *  `noindex, follow` and a canonical back to the clean base path so link
 *  equity still flows to it without indexing near-duplicate combinations. */
export function catalogueCanonicalMetadata(
  basePath: string,
  params: SearchParams,
): Pick<Metadata, "alternates" | "robots"> {
  const filtered = isFilteredCatalogueView(params);
  return {
    alternates: { canonical: basePath },
    robots: filtered
      ? { index: false, follow: true }
      : { index: true, follow: true },
  };
}
