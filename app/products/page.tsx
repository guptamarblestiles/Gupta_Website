import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { FilterSidebar } from "@/components/catalogue/FilterSidebar";
import { ProductGrid } from "@/components/catalogue/ProductGrid";
import { Pagination } from "@/components/catalogue/Pagination";
import { getAvailableSizes, getProducts } from "@/lib/products/queries";
import type { ProductCategory, ProductFilters, ProductFinish } from "@/types/product";

const CATALOGUE_TITLE = "Catalogue";
const CATALOGUE_DESCRIPTION =
  "Browse D R Traders' full collection of marble slabs, granite slabs, GVT tiles, and bathroom tiles.";

export const metadata: Metadata = {
  title: CATALOGUE_TITLE,
  description: CATALOGUE_DESCRIPTION,
  openGraph: {
    title: CATALOGUE_TITLE,
    description: CATALOGUE_DESCRIPTION,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: CATALOGUE_TITLE,
    description: CATALOGUE_DESCRIPTION,
  },
};

const CATEGORY_VALUES: readonly ProductCategory[] = [
  "Marble Slabs",
  "Granite Slabs",
  "GVT Tiles",
  "Bathroom Tiles",
];
const FINISH_VALUES: readonly ProductFinish[] = ["Polished", "Honed", "Matte", "Leathered"];
const PAGE_SIZE = 12;

function toList(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/** Rebuilds the catalogue URL for a given page, preserving every other
 *  active search param (filters, search) exactly as-is. */
function buildPageHref(
  rawParams: Record<string, string | string[] | undefined>,
  page: number,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(rawParams)) {
    if (key === "page" || !value) continue;
    if (Array.isArray(value)) value.forEach((v) => query.append(key, v));
    else query.set(key, value);
  }
  if (page > 1) query.set("page", String(page));
  const qs = query.toString();
  return qs ? `/products?${qs}` : "/products";
}

type ProductsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;

  const filters: ProductFilters = {
    category: toList(params.category).filter((v): v is ProductCategory =>
      CATEGORY_VALUES.includes(v as ProductCategory),
    ),
    finish: toList(params.finish).filter((v): v is ProductFinish =>
      FINISH_VALUES.includes(v as ProductFinish),
    ),
    size: toList(params.size),
    search: typeof params.q === "string" ? params.q : undefined,
  };

  const requestedPage = Number.parseInt(
    typeof params.page === "string" ? params.page : "1",
    10,
  );
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;

  const [{ products, total }, sizes] = await Promise.all([
    getProducts(filters, page, PAGE_SIZE),
    getAvailableSizes(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <Navbar variant="light" />
      <main className="pt-16 md:pt-20">
        <section className="py-section-gap">
          <Container>
            <div className="mb-10 md:mb-12 max-w-2xl">
              <p className="mb-4 font-body text-label uppercase tracking-widest text-secondary-strong">
                Catalogue
              </p>
              <h1 className="font-display text-headline md:text-display-mobile text-on-surface">
                The Full Collection
              </h1>
              <p className="mt-4 font-body text-body-lg text-on-surface-variant">
                Marble, granite, GVT, and bathroom surfaces curated for architectural spaces.
              </p>
            </div>

            <div className="lg:flex lg:items-start lg:gap-gutter">
              <FilterSidebar filters={filters} resultCount={total} sizes={sizes} />
              <div className="flex-1 flex flex-col">
                {/* Visually hidden — TileCard's product names are h3s, so
                    the grid needs an h2 between them and the h1 above to
                    keep the heading order valid (WCAG 1.3.1 / task 11). */}
                <h2 className="sr-only">Product Results</h2>
                <ProductGrid products={products} />
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  prevHref={page > 1 ? buildPageHref(params, page - 1) : undefined}
                  nextHref={page < totalPages ? buildPageHref(params, page + 1) : undefined}
                />
              </div>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
