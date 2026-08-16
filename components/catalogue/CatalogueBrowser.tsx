/**
 * Shared filter-sidebar + grid + pagination layout used by both /products
 * and /tiles — the two ended up functionally identical (full filters, all
 * products visible by default) after /tiles was asked to keep filters
 * rather than being a bare unfiltered list, so this factors out the one
 * implementation both routes call instead of duplicating it.
 */
import { FilterSidebar } from "@/components/catalogue/FilterSidebar";
import { ProductGrid } from "@/components/catalogue/ProductGrid";
import { Pagination } from "@/components/catalogue/Pagination";
import { getFilterFacets, getProducts } from "@/lib/products/queries";
import type { ProductFilters } from "@/types/product";

const PAGE_SIZE = 12;

function toList(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

type CatalogueBrowserProps = {
  basePath: string;
  params: Record<string, string | string[] | undefined>;
};

export async function CatalogueBrowser({ basePath, params }: CatalogueBrowserProps) {
  // No hardcoded whitelist here on purpose (see FILTER CONTRACT in
  // lib/products/queries.ts) — an unrecognized value just matches zero
  // rows via .in(...), same as any other filter combo with no results.
  const filters: ProductFilters = {
    category: toList(params.category),
    finish: toList(params.finish),
    size: toList(params.size),
    color: toList(params.color),
    wallOrFloor: toList(params.wallOrFloor),
    collection: toList(params.collection),
    search: typeof params.q === "string" ? params.q : undefined,
  };

  const requestedPage = Number.parseInt(typeof params.page === "string" ? params.page : "1", 10);
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;

  const [{ products, total }, facets] = await Promise.all([
    getProducts(filters, page, PAGE_SIZE),
    getFilterFacets(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(targetPage: number): string {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key === "page" || !value) continue;
      if (Array.isArray(value)) value.forEach((v) => query.append(key, v));
      else query.set(key, value);
    }
    if (targetPage > 1) query.set("page", String(targetPage));
    const qs = query.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <div className="lg:flex lg:items-start lg:gap-gutter">
      <FilterSidebar filters={filters} resultCount={total} facets={facets} />
      <div className="flex-1 flex flex-col">
        {/* Visually hidden — TileCard's product names are h3s, so the grid
            needs an h2 between them and the h1 above to keep the heading
            order valid (WCAG 1.3.1 / task 11). */}
        <h2 className="sr-only">Product Results</h2>
        <ProductGrid products={products} />
        <Pagination
          page={page}
          totalPages={totalPages}
          prevHref={page > 1 ? pageHref(page - 1) : undefined}
          nextHref={page < totalPages ? pageHref(page + 1) : undefined}
        />
      </div>
    </div>
  );
}
