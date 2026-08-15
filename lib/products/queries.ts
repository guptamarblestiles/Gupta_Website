import type { PaginatedProducts, Product, ProductFilters } from "@/types/product";
import { MOCK_PRODUCTS } from "@/lib/products/mockProducts";

const DEFAULT_PAGE_SIZE = 24;

/**
 * Filters + paginates the catalogue. Reads MOCK_PRODUCTS today; the
 * signature (async, ProductFilters + page/pageSize in, PaginatedProducts
 * out) already matches what a real Supabase `.from("products")` query
 * looks like, so swapping the body over (task 8+) is a same-file change,
 * not a rewrite of any caller.
 */
export async function getProducts(
  filters: ProductFilters = {},
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<PaginatedProducts> {
  // Callers may pass page straight from a URL search param — clamp so a
  // malformed or out-of-range value (0, negative, a decimal) can't produce
  // a negative slice() start.
  const safePage = Math.max(1, Math.trunc(page) || 1);
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

  const start = (safePage - 1) * pageSize;
  const products = filtered.slice(start, start + pageSize);

  return {
    products,
    total: filtered.length,
    page: safePage,
    pageSize,
    hasMore: start + pageSize < filtered.length,
  };
}

/** Single product lookup for the product detail page (task 9). */
export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  return MOCK_PRODUCTS.find((product) => product.slug === slug);
}

/**
 * "Related Selections" (task 9) — other products in the same category,
 * excluding the one being viewed, newest-first by id. Falls back to other
 * categories if fewer than `limit` share this product's category so the
 * grid never renders emptier than it needs to.
 */
export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const sameCategory = MOCK_PRODUCTS.filter(
    (candidate) => candidate.id !== product.id && candidate.category === product.category,
  );
  if (sameCategory.length >= limit) return sameCategory.slice(0, limit);

  const others = MOCK_PRODUCTS.filter(
    (candidate) => candidate.id !== product.id && candidate.category !== product.category,
  );
  return [...sameCategory, ...others].slice(0, limit);
}
