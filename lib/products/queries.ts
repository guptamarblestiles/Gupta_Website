/**
 * FILTER CONTRACT — read this before touching filter behavior.
 *
 * Filter groups (see FILTER_KEYS in types/product.ts): application, rooms,
 * size, pattern, color, thickness, category, series, finish. Selected values
 * are OR'd within a group and AND'd across groups, always applied
 * server-side — never by slicing a fetched list.
 *
 * Option lists AND counts come from getFilterFacets(): distinct values
 * actually present in visible products, with each count computed against
 * every OTHER active filter (so a count is "how many results you'd get if
 * you also ticked this"). Nothing is hardcoded.
 *
 * Legacy rows predate the normalized columns, so two groups fall back:
 * application = application ?? wall_or_floor, series = series ?? collection.
 * Columns are selected explicitly (never "*") to keep egress small; this
 * requires the 20261011160000 curation migration to be applied.
 * Row visibility (is_visible) is enforced by RLS, not by this code.
 *
 * Caching/errors: every public read is wrapped in unstable_cache (1h, tag
 * "products") on a cookie-less client. Supabase failures THROW — they are
 * never replaced by mock/empty data — so nothing broken is ever cached and
 * Next keeps serving the last good ISR page.
 */
import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicSupabaseClient } from "@/lib/supabase/server";
import { CATALOGUE_SIZES, MOCK_PRODUCTS } from "@/lib/products/mockProducts";
import { buildImageAlt } from "@/lib/products/alt";
import {
  FILTER_KEYS,
  type FilterKey,
  type PaginatedProducts,
  type Product,
  type ProductFilterFacets,
  type ProductFilters,
} from "@/types/product";

const DEFAULT_PAGE_SIZE = 24;
const FACET_PAGE_SIZE = 1000; // PostgREST silently caps a response at 1000 rows
const FACET_ROW_LIMIT = 10_000;
const MAX_SEARCH_LENGTH = 80;
const CACHE_SECONDS = 3600;
const PRODUCTS_TAG = "products";

function queryFailed(what: string, error: { code?: string; message: string }): Error {
  return new Error(`Supabase ${what} query failed: ${error.code ?? "unknown"} ${error.message}`);
}

type SourcePdfRow = {
  id: string;
  title: string;
  original_filename: string;
  file_url: string | null;
  file_size_bytes: number | null;
};

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  product_code: string;
  category: string;
  finish: string | null;
  size: string | null;
  color: string | null;
  wall_or_floor: string | null;
  collection: string | null;
  application?: string | null;
  rooms?: string[] | null;
  pattern?: string | null;
  thickness?: string | null;
  material?: string | null;
  series?: string | null;
  finish_detail?: string | null;
  source_page?: number | null;
  source_pdfs?: SourcePdfRow | null;
  price: number | null;
  price_unit: string | null;
  price_note: string | null;
  description: string;
  created_at: string;
  updated_at: string;
  product_images?: { image_url: string; sort_order: number }[];
};

/** product_images has no `alt` column — derive it from the product's own
 *  name/finish/size/category so every image gets descriptive, SEO-useful
 *  alt text without a DB round-trip. */
function rowToProduct(row: ProductRow): Product {
  const images = [...(row.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const pdf = row.source_pdfs;
  const imageAlt = buildImageAlt({
    name: row.name,
    finish: row.finish ?? "",
    size: row.size ?? "",
    category: row.category,
  });

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    productCode: row.product_code,
    category: row.category,
    finish: row.finish ?? "",
    size: row.size ?? "",
    color: row.color ?? undefined,
    wallOrFloor: row.wall_or_floor ?? undefined,
    collection: row.collection ?? undefined,
    application: row.application ?? row.wall_or_floor ?? undefined,
    rooms: row.rooms?.length ? row.rooms : undefined,
    pattern: row.pattern ?? undefined,
    thickness: row.thickness ?? undefined,
    material: row.material ?? undefined,
    series: row.series ?? row.collection ?? undefined,
    finishDetail: row.finish_detail ?? undefined,
    sourcePage: row.source_page ?? undefined,
    sourcePdf: pdf
      ? {
          id: pdf.id,
          title: pdf.title,
          originalFilename: pdf.original_filename,
          fileUrl: pdf.file_url ?? undefined,
          fileSizeBytes: pdf.file_size_bytes ?? undefined,
        }
      : undefined,
    price: row.price ?? undefined,
    priceUnit: row.price_unit ?? undefined,
    priceNote: row.price_note ?? undefined,
    description: row.description,
    imageUrl: images[0]?.image_url ?? "",
    images: images.map((img, i) => ({
      id: `${row.id}-${i}`,
      productId: row.id,
      imageUrl: img.image_url,
      alt: imageAlt,
      sortOrder: img.sort_order,
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** PostgREST's `or=(...)` filter syntax treats `,`, `(`, `)` as structural —
 *  strip them from user-typed search input so a stray character can't
 *  reshape the filter instead of just failing to match anything. */
function sanitizeSearchTerm(term: string): string {
  const cleaned = term.replace(/[,()"]/g, " ").trim().slice(0, MAX_SEARCH_LENGTH);
  // Escape LIKE wildcards so user input matches literally.
  return cleaned.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Quote a value for use inside a PostgREST `in.(...)` list. */
function quoted(values: string[]): string {
  return values.map((v) => `"${v.replace(/["\\]/g, "")}"`).join(",");
}

// Exactly the columns rowToProduct reads — no internal/audit columns
// (created_by, updated_by, status, review fields).
const PRODUCT_COLUMNS =
  "id, name, slug, product_code, category, finish, size, color, wall_or_floor, collection, application, rooms, pattern, thickness, material, series, finish_detail, source_page, price, price_unit, price_note, description, created_at, updated_at";
const LIST_SELECT = `${PRODUCT_COLUMNS}, product_images(image_url, sort_order)`;
const DETAIL_SELECT = `${LIST_SELECT}, source_pdfs(id, title, original_filename, file_url, file_size_bytes)`;
// Only what getFilterFacets / matches() need.
const FACET_COLUMNS =
  "name, product_code, category, finish, size, color, application, wall_or_floor, rooms, pattern, thickness, series, collection";

/** Stable cache-key fragment: sorted keys and sorted value lists, so
 *  equivalent filters share one cache entry. */
function filtersKey(filters: ProductFilters): string {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(filters).sort() as (keyof ProductFilters)[]) {
    const v = filters[key];
    if (v === undefined || v === null) continue;
    // Search text is trimmed/lowercased/capped like the query itself, so
    // junk variants of one search (bots) cannot mint unlimited cache entries.
    if (key === "search") {
      const term = String(v).trim().toLowerCase().slice(0, 80);
      if (term) out[key] = term;
      continue;
    }
    out[key] = Array.isArray(v) ? [...v].sort() : v;
  }
  return JSON.stringify(out);
}

async function fetchProducts(
  filters: ProductFilters,
  safePage: number,
  pageSize: number,
): Promise<PaginatedProducts> {
  const start = (safePage - 1) * pageSize;

  const client = getPublicSupabaseClient();
  if (!client) {
    return getProductsFromMock(filters, safePage, pageSize, start);
  }

  let query = client.from("products").select(LIST_SELECT, { count: "exact" });
  if (filters.category?.length) query = query.in("category", filters.category);
  if (filters.finish?.length) query = query.in("finish", filters.finish);
  if (filters.size?.length) query = query.in("size", filters.size);
  if (filters.color?.length) query = query.in("color", filters.color);
  if (filters.pattern?.length) query = query.in("pattern", filters.pattern);
  if (filters.thickness?.length) query = query.in("thickness", filters.thickness);
  if (filters.rooms?.length) query = query.overlaps("rooms", filters.rooms);
  if (filters.application?.length) {
    const list = quoted(filters.application);
    query = query.or(`application.in.(${list}),and(application.is.null,wall_or_floor.in.(${list}))`);
  }
  if (filters.series?.length) {
    const list = quoted(filters.series);
    query = query.or(`series.in.(${list}),and(series.is.null,collection.in.(${list}))`);
  }
  if (filters.search?.trim()) {
    const term = sanitizeSearchTerm(filters.search);
    if (term) {
      query = query.or(
        `name.ilike.%${term}%,product_code.ilike.%${term}%,category.ilike.%${term}%,finish.ilike.%${term}%,size.ilike.%${term}%`,
      );
    }
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .order("id") // tiebreaker: equal created_at must not duplicate/skip rows across pages
    .range(start, start + pageSize - 1);

  // PostgREST answers 416 / PGRST103 when the page is past the last row
  // (stale ?page=N links): show an empty page instead of an error screen.
  if (error && (error as { code?: string }).code === "PGRST103") {
    return { products: [], total: 0, page: safePage, pageSize, hasMore: false };
  }
  if (error) throw queryFailed("products", error);

  const products = (data ?? []).map((r) => rowToProduct(r as unknown as ProductRow));
  const total = count ?? products.length;

  return { products, total, page: safePage, pageSize, hasMore: start + pageSize < total };
}

/**
 * Filters + paginates the catalogue (cached 1h, tag "products"). Reads from
 * Supabase; the typed MOCK_PRODUCTS dataset is used only in local dev/test
 * when Supabase isn't configured. Throws on Supabase failure.
 */
export async function getProducts(
  filters: ProductFilters = {},
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<PaginatedProducts> {
  const safePage = Math.max(1, Math.trunc(page) || 1);
  return unstable_cache(
    () => fetchProducts(filters, safePage, pageSize),
    ["products:list", filtersKey(filters), String(safePage), String(pageSize)],
    { revalidate: CACHE_SECONDS, tags: [PRODUCTS_TAG] },
  )();
}

/** Minimal per-product record the facet counter works on. */
type FacetRow = Record<FilterKey, string[]> & { haystack: string };

function toFacetRow(row: {
  name: string;
  product_code: string;
  category: string;
  finish?: string | null;
  size?: string | null;
  color?: string | null;
  application?: string | null;
  wall_or_floor?: string | null;
  rooms?: string[] | null;
  pattern?: string | null;
  thickness?: string | null;
  series?: string | null;
  collection?: string | null;
}): FacetRow {
  const one = (v: string | null | undefined) => (v?.trim() ? [v.trim()] : []);
  return {
    application: one(row.application ?? row.wall_or_floor),
    rooms: (row.rooms ?? []).filter((r) => r.trim()),
    size: one(row.size),
    pattern: one(row.pattern),
    color: one(row.color),
    thickness: one(row.thickness),
    category: one(row.category),
    series: one(row.series ?? row.collection),
    finish: one(row.finish),
    haystack: `${row.name} ${row.product_code} ${row.category} ${row.finish ?? ""} ${row.size ?? ""}`.toLowerCase(),
  };
}

function matches(row: FacetRow, filters: ProductFilters, skip?: FilterKey): boolean {
  for (const key of FILTER_KEYS) {
    if (key === skip) continue;
    const selected = filters[key];
    if (selected?.length && !row[key].some((v) => selected.includes(v))) return false;
  }
  const term = filters.search?.trim().toLowerCase();
  return !term || row.haystack.includes(term);
}

async function loadFacetRows(): Promise<FacetRow[]> {
  const client = getPublicSupabaseClient();
  if (!client) {
    return MOCK_PRODUCTS.map((p) =>
      toFacetRow({
        name: p.name,
        product_code: p.productCode,
        category: p.category,
        finish: p.finish,
        size: p.size,
      }),
    );
  }
  // Page in chunks of 1000 so PostgREST's response cap can't silently
  // truncate the facet source rows.
  const rows: FacetRow[] = [];
  for (let from = 0; from < FACET_ROW_LIMIT; from += FACET_PAGE_SIZE) {
    const { data, error } = await client
      .from("products")
      .select(FACET_COLUMNS)
      .order("id")
      .range(from, from + FACET_PAGE_SIZE - 1);
    if (error) throw queryFailed("facets", error);
    const batch = (data ?? []) as unknown as Parameters<typeof toFacetRow>[0][];
    rows.push(...batch.map(toFacetRow));
    if (batch.length < FACET_PAGE_SIZE) return rows;
  }
  console.warn(`getFilterFacets: hit the ${FACET_ROW_LIMIT}-row cap; facet counts may be incomplete`);
  return rows;
}

function getProductsFromMock(
  filters: ProductFilters,
  safePage: number,
  pageSize: number,
  start: number,
): PaginatedProducts {
  const filtered = MOCK_PRODUCTS.filter((product) =>
    matches(
      toFacetRow({
        name: product.name,
        product_code: product.productCode,
        category: product.category,
        finish: product.finish,
        size: product.size,
      }),
      filters,
    ),
  );
  const products = filtered.slice(start, start + pageSize);
  return {
    products,
    total: filtered.length,
    page: safePage,
    pageSize,
    hasMore: start + pageSize < filtered.length,
  };
}

async function computeFilterFacets(filters: ProductFilters): Promise<ProductFilterFacets> {
  const rows = await loadFacetRows();
  const facets = {} as ProductFilterFacets;

  for (const key of FILTER_KEYS) {
    const counts = new Map<string, number>();
    for (const row of rows) {
      if (!matches(row, filters, key)) continue;
      for (const value of new Set(row[key])) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    for (const value of filters[key] ?? []) if (!counts.has(value)) counts.set(value, 0);

    facets[key] = [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value, undefined, { numeric: true }));
  }

  if (!facets.size.length && !getPublicSupabaseClient()) {
    facets.size = CATALOGUE_SIZES.map((value) => ({ value, count: 0 }));
  }
  return facets;
}

/**
 * Option lists with live counts for every filter group (cached 1h, tag
 * "products"). Selected values stay listed even at count 0 so they can always
 * be un-ticked. Sizes fall back to the curated CATALOGUE_SIZES only in local
 * dev when Supabase isn't configured and the mock data yields none.
 */
export async function getFilterFacets(filters: ProductFilters = {}): Promise<ProductFilterFacets> {
  return unstable_cache(() => computeFilterFacets(filters), ["products:facets", filtersKey(filters)], {
    revalidate: CACHE_SECONDS,
    tags: [PRODUCTS_TAG],
  })();
}

async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const client = getPublicSupabaseClient();
  if (!client) return MOCK_PRODUCTS.find((product) => product.slug === slug) ?? null;

  const { data, error } = await client.from("products").select(DETAIL_SELECT).eq("slug", slug).maybeSingle();
  if (error) throw queryFailed("product", error);
  return data ? rowToProduct(data as unknown as ProductRow) : null;
}

/** Single product lookup for the product detail page, including its gallery
 *  images and source PDF. Cached 1h (tag "products") and wrapped in React
 *  cache() so generateMetadata and the page share one call per request. */
export const getProductBySlug = cache(async (slug: string): Promise<Product | undefined> => {
  const product = await unstable_cache(() => fetchProductBySlug(slug), ["products:slug", slug], {
    revalidate: CACHE_SECONDS,
    tags: [PRODUCTS_TAG],
  })();
  return product ?? undefined;
});

/**
 * "Related Selections" — other products in the same category, excluding
 * the one being viewed. Falls back to other categories if fewer than
 * `limit` share this product's category so the grid never renders emptier
 * than it needs to.
 */
export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  return unstable_cache(
    () => fetchRelatedProducts(product.id, product.category, limit),
    ["products:related", product.id, product.category, String(limit)],
    { revalidate: CACHE_SECONDS, tags: [PRODUCTS_TAG] },
  )();
}

async function fetchRelatedProducts(productId: string, category: string, limit: number): Promise<Product[]> {
  const client = getPublicSupabaseClient();
  if (!client) {
    const current = MOCK_PRODUCTS.find((p) => p.id === productId);
    return getRelatedFromMock({ id: productId, category, ...(current ?? {}) } as Product, limit);
  }

  const { data: sameCategoryRows, error: sameCategoryError } = await client
    .from("products")
    .select(LIST_SELECT)
    .eq("category", category)
    .neq("id", productId)
    .order("created_at", { ascending: false })
    .order("id")
    .limit(limit);
  if (sameCategoryError) throw queryFailed("related products", sameCategoryError);

  const related = (sameCategoryRows ?? []).map((r) => rowToProduct(r as unknown as ProductRow));
  if (related.length >= limit) return related;

  const { data: otherRows, error: otherError } = await client
    .from("products")
    .select(LIST_SELECT)
    .neq("category", category)
    .neq("id", productId)
    .order("created_at", { ascending: false })
    .order("id")
    .limit(limit - related.length);
  if (otherError) throw queryFailed("related products", otherError);

  return [...related, ...(otherRows ?? []).map((r) => rowToProduct(r as unknown as ProductRow))];
}

/** Slug + updated_at of every visible product, for sitemap.xml. Paged in
 *  1000-row chunks; cached 1h (tag "products"); throws on failure so the
 *  sitemap is never published without its products. */
export async function getSitemapProducts(): Promise<{ slug: string; updated_at: string | null }[]> {
  return unstable_cache(fetchSitemapProducts, ["products:sitemap"], {
    revalidate: CACHE_SECONDS,
    tags: [PRODUCTS_TAG],
  })();
}

async function fetchSitemapProducts(): Promise<{ slug: string; updated_at: string | null }[]> {
  const client: SupabaseClient | null = getPublicSupabaseClient();
  if (!client) return MOCK_PRODUCTS.map((p) => ({ slug: p.slug, updated_at: p.updatedAt }));

  const rows: { slug: string; updated_at: string | null }[] = [];
  for (let from = 0; from < FACET_ROW_LIMIT * 5; from += FACET_PAGE_SIZE) {
    const { data, error } = await client
      .from("products")
      .select("slug, updated_at")
      .eq("is_visible", true)
      .order("id")
      .range(from, from + FACET_PAGE_SIZE - 1);
    if (error) throw queryFailed("sitemap products", error);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < FACET_PAGE_SIZE) break;
  }
  return rows;
}

function getRelatedFromMock(product: Product, limit: number): Product[] {
  const sameCategory = MOCK_PRODUCTS.filter(
    (candidate) => candidate.id !== product.id && candidate.category === product.category,
  );
  if (sameCategory.length >= limit) return sameCategory.slice(0, limit);

  const others = MOCK_PRODUCTS.filter(
    (candidate) => candidate.id !== product.id && candidate.category !== product.category,
  );
  return [...sameCategory, ...others].slice(0, limit);
}
