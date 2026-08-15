import { getSupabaseServerClient } from "@/lib/supabase/server";
import { CATALOGUE_SIZES, MOCK_PRODUCTS } from "@/lib/products/mockProducts";
import type {
  PaginatedProducts,
  Product,
  ProductCategory,
  ProductFilters,
  ProductFinish,
  ProductImage,
} from "@/types/product";

const DEFAULT_PAGE_SIZE = 24;

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  product_code: string;
  category: string;
  finish: string;
  size: string;
  origin: string | null;
  material: string | null;
  available_finishes: string | null;
  description: string;
  image_url: string;
  created_at: string;
  updated_at: string;
};

type ProductImageRow = {
  id: string;
  product_id: string;
  image_url: string;
  alt: string;
  sort_order: number;
};

function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    productCode: row.product_code,
    category: row.category as ProductCategory,
    finish: row.finish as ProductFinish,
    size: row.size,
    origin: row.origin ?? undefined,
    material: row.material ?? undefined,
    availableFinishes: row.available_finishes ?? undefined,
    description: row.description,
    imageUrl: row.image_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToProductImage(row: ProductImageRow): ProductImage {
  return {
    id: row.id,
    productId: row.product_id,
    imageUrl: row.image_url,
    alt: row.alt,
    sortOrder: row.sort_order,
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

  let query = client.from("products").select("*", { count: "exact" });
  if (filters.category?.length) query = query.in("category", filters.category);
  if (filters.finish?.length) query = query.in("finish", filters.finish);
  if (filters.size?.length) query = query.in("size", filters.size);
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
 * Distinct sizes currently in the catalogue — drives the Size filter's
 * option list so it never offers a value that matches zero live products.
 * Falls back to the mock dataset's curated CATALOGUE_SIZES when Supabase
 * isn't configured.
 */
export async function getAvailableSizes(): Promise<string[]> {
  const client = getSupabaseServerClient();
  if (!client) return [...CATALOGUE_SIZES];

  const { data, error } = await client.from("products").select("size");
  if (error) throw error;

  const sizes = new Set((data ?? []).map((row) => row.size as string));
  return [...sizes].sort();
}

/** Single product lookup for the product detail page, including its
 *  gallery images ordered by sort_order. */
export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const client = getSupabaseServerClient();
  if (!client) return MOCK_PRODUCTS.find((product) => product.slug === slug);

  const { data, error } = await client.from("products").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (!data) return undefined;

  const product = rowToProduct(data);

  const { data: imageRows, error: imageError } = await client
    .from("product_images")
    .select("*")
    .eq("product_id", product.id)
    .order("sort_order", { ascending: true });
  if (imageError) throw imageError;

  product.images = (imageRows ?? []).map(rowToProductImage);
  return product;
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
    .select("*")
    .eq("category", product.category)
    .neq("id", product.id)
    .limit(limit);
  if (sameCategoryError) throw sameCategoryError;

  const related = (sameCategoryRows ?? []).map(rowToProduct);
  if (related.length >= limit) return related;

  const { data: otherRows, error: otherError } = await client
    .from("products")
    .select("*")
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
