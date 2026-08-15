import type { PaginatedProducts, ProductFilters } from "@/types/product";
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

  const start = (page - 1) * pageSize;
  const products = filtered.slice(start, start + pageSize);

  return {
    products,
    total: filtered.length,
    page,
    pageSize,
    hasMore: start + pageSize < filtered.length,
  };
}
