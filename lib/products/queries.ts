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
 * New columns are read via select("*") and never named in a select list, so
 * this code is safe to deploy before OR after the migration is applied.
 * Row visibility (is_visible) is enforced by RLS, not by this code.
 */
import { getSupabaseServerClient } from "@/lib/supabase/server";
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
const FACET_ROW_LIMIT = 5000;

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
  return term.replace(/[,()"]/g, " ").trim();
}

/** Quote a value for use inside a PostgREST `in.(...)` list. */
function quoted(values: string[]): string {
  return values.map((v) => `"${v.replace(/["\\]/g, "")}"`).join(",");
}

// Query joins. The source_pdfs embed needs the migration; the plain select
// is the fallback if it hasn't been applied yet.
const LIST_SELECT = "*, product_images(image_url, sort_order)";
const DETAIL_SELECT = "*, product_images(image_url, sort_order), source_pdfs(id, title, original_filename, file_url, file_size_bytes)";

/**
 * Filters + paginates the catalogue. Reads from Supabase when
 * NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are set;
 * falls back to the typed MOCK_PRODUCTS dataset otherwise.
 */
export async function getProducts(
  filters: ProductFilters = {},
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<PaginatedProducts> {
  const safePage = Math.max(1, Math.trunc(page) || 1);
  const start = (safePage - 1) * pageSize;

  const client = getSupabaseServerClient();
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
    .range(start, start + pageSize - 1);

  if (error) throw error;

  const products = (data ?? []).map(rowToProduct);
  const total = count ?? products.length;

  return { products, total, page: safePage, pageSize, hasMore: start + pageSize < total };
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
  const client = getSupabaseServerClient();
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
  const { data, error } = await client
    .from("products")
    .select("*")
    .range(0, FACET_ROW_LIMIT - 1);
  if (error) throw error;
  return (data ?? []).map(toFacetRow);
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

/**
 * Option lists with live counts for every filter group. Selected values stay
 * listed even at count 0 so they can always be un-ticked. Sizes fall back to
 * the curated CATALOGUE_SIZES only when Supabase isn't configured and the
 * mock data yields none.
 */
export async function getFilterFacets(filters: ProductFilters = {}): Promise<ProductFilterFacets> {
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

  if (!facets.size.length && !getSupabaseServerClient()) {
    facets.size = CATALOGUE_SIZES.map((value) => ({ value, count: 0 }));
  }
  return facets;
}

/** Single product lookup for the product detail page, including its
 *  gallery images and source PDF. Falls back to a join-less query if the
 *  source_pdfs migration isn't applied yet. */
export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const client = getSupabaseServerClient();
  if (!client) return MOCK_PRODUCTS.find((product) => product.slug === slug);

  let result = await client.from("products").select(DETAIL_SELECT).eq("slug", slug).maybeSingle();
  if (result.error) {
    result = await client.from("products").select(LIST_SELECT).eq("slug", slug).maybeSingle();
  }
  if (result.error) throw result.error;
  if (!result.data) return undefined;

  return rowToProduct(result.data as unknown as ProductRow);
}

/**
 * "Related Selections" — other products in the same category, excluding
 * the one being viewed. Falls back to other categories if fewer than
 * `limit` share this product's category so the grid never renders emptier
 * than it needs to.
 */
export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const client = getSupabaseServerClient();
  if (!client) return getRelatedFromMock(product, limit);

  const { data: sameCategoryRows, error: sameCategoryError } = await client
    .from("products")
    .select("*, product_images(image_url, sort_order)")
    .eq("category", product.category)
    .neq("id", product.id)
    .limit(limit);
  if (sameCategoryError) throw sameCategoryError;

  const related = (sameCategoryRows ?? []).map(rowToProduct);
  if (related.length >= limit) return related;

  const { data: otherRows, error: otherError } = await client
    .from("products")
    .select("*, product_images(image_url, sort_order)")
    .neq("category", product.category)
    .neq("id", product.id)
    .limit(limit - related.length);
  if (otherError) throw otherError;

  return [...related, ...(otherRows ?? []).map(rowToProduct)];
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
