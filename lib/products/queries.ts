/**
 * FILTER CONTRACT (Part 3) — read this before touching filter behavior.
 *
 * ProductFilters keys (category/finish/size/color/wallOrFloor/collection)
 * map 1:1 to `products` columns (wallOrFloor -> wall_or_floor) and are
 * always applied server-side via `.in(...)`, never filtered client-side
 * from a full fetched list. Each is a checkbox multi-select in
 * FilterSidebar, OR'd within a facet and AND'd across facets. `search`
 * matches name/product_code/category via ilike OR.
 *
 * Option lists for every facet come from getFilterFacets() — distinct
 * values actually present in `products` right now — never a hardcoded
 * enum, since the real taxonomy (category/finish especially) comes from
 * whatever folder names were fed through the Part 2 import and will keep
 * changing as more products are added.
 */
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { CATALOGUE_SIZES, MOCK_PRODUCTS } from "@/lib/products/mockProducts";
import type { PaginatedProducts, Product, ProductFilterFacets, ProductFilters } from "@/types/product";

const DEFAULT_PAGE_SIZE = 24;

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
  price: number | null;
  price_unit: string | null;
  price_note: string | null;
  description: string;
  created_at: string;
  updated_at: string;
  product_images?: { image_url: string; sort_order: number }[];
};

/** product_images has no `alt` column — derive it from the product name so
 *  every image still gets reasonable alt text without a DB round-trip. */
function rowToProduct(row: ProductRow): Product {
  const images = [...(row.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);

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
    price: row.price ?? undefined,
    priceUnit: row.price_unit ?? undefined,
    priceNote: row.price_note ?? undefined,
    description: row.description,
    imageUrl: images[0]?.image_url ?? "",
    images: images.map((img, i) => ({
      id: `${row.id}-${i}`,
      productId: row.id,
      imageUrl: img.image_url,
      alt: row.name,
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
  return term.replace(/[,()]/g, " ").trim();
}

/**
 * Filters + paginates the catalogue. Reads from Supabase when
 * NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are set;
 * falls back to the typed MOCK_PRODUCTS dataset otherwise (local dev
 * without credentials, or this repo checked out fresh) so the catalogue
 * never renders empty.
 */
export async function getProducts(
  filters: ProductFilters = {},
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<PaginatedProducts> {
  // Callers may pass page straight from a URL search param — clamp so a
  // malformed or out-of-range value (0, negative, a decimal) can't produce
  // a negative slice()/range() start.
  const safePage = Math.max(1, Math.trunc(page) || 1);
  const start = (safePage - 1) * pageSize;

  const client = getSupabaseServerClient();
  if (!client) {
    return getProductsFromMock(filters, safePage, pageSize, start);
  }

  let query = client
    .from("products")
    .select("*, product_images(image_url, sort_order)", { count: "exact" });
  if (filters.category?.length) query = query.in("category", filters.category);
  if (filters.finish?.length) query = query.in("finish", filters.finish);
  if (filters.size?.length) query = query.in("size", filters.size);
  if (filters.color?.length) query = query.in("color", filters.color);
  if (filters.wallOrFloor?.length) query = query.in("wall_or_floor", filters.wallOrFloor);
  if (filters.collection?.length) query = query.in("collection", filters.collection);
  if (filters.search?.trim()) {
    const term = sanitizeSearchTerm(filters.search);
    if (term) {
      query = query.or(`name.ilike.%${term}%,product_code.ilike.%${term}%,category.ilike.%${term}%`);
    }
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(start, start + pageSize - 1);

  if (error) throw error;

  const products = (data ?? []).map(rowToProduct);
  const total = count ?? products.length;

  return {
    products,
    total,
    page: safePage,
    pageSize,
    hasMore: start + pageSize < total,
  };
}

function getProductsFromMock(
  filters: ProductFilters,
  safePage: number,
  pageSize: number,
  start: number,
): PaginatedProducts {
  const search = filters.search?.trim().toLowerCase();

  const filtered = MOCK_PRODUCTS.filter((product) => {
    if (filters.category?.length && !filters.category.includes(product.category)) return false;
    if (filters.finish?.length && !filters.finish.includes(product.finish)) return false;
    if (filters.size?.length && !filters.size.includes(product.size)) return false;
    if (search) {
      const haystack = `${product.name} ${product.productCode} ${product.category}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

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
 * Distinct facet values currently in the catalogue — drives every
 * FilterSidebar option list so it never offers a value that matches zero
 * live products (see FILTER CONTRACT above). One query, 234 rows worth of
 * plain columns; distinct-ing client-side is cheap at this catalogue size
 * and avoids six separate round-trips. Falls back to the mock dataset's
 * curated CATALOGUE_SIZES (sizes only) when Supabase isn't configured.
 */
export async function getFilterFacets(): Promise<ProductFilterFacets> {
  const client = getSupabaseServerClient();
  if (!client) {
    return {
      categories: [],
      finishes: [],
      sizes: [...CATALOGUE_SIZES],
      colors: [],
      wallOrFloors: [],
      collections: [],
    };
  }

  const { data, error } = await client
    .from("products")
    .select("category, finish, size, color, wall_or_floor, collection");
  if (error) throw error;

  const distinct = (values: (string | null)[]) =>
    [...new Set(values.filter((v): v is string => Boolean(v?.trim())))].sort();

  const rows = data ?? [];
  return {
    categories: distinct(rows.map((r) => r.category)),
    finishes: distinct(rows.map((r) => r.finish)),
    sizes: distinct(rows.map((r) => r.size)),
    colors: distinct(rows.map((r) => r.color)),
    wallOrFloors: distinct(rows.map((r) => r.wall_or_floor)),
    collections: distinct(rows.map((r) => r.collection)),
  };
}

/** Single product lookup for the product detail page, including its
 *  gallery images ordered by sort_order. */
export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const client = getSupabaseServerClient();
  if (!client) return MOCK_PRODUCTS.find((product) => product.slug === slug);

  const { data, error } = await client
    .from("products")
    .select("*, product_images(image_url, sort_order)")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return undefined;

  return rowToProduct(data);
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
