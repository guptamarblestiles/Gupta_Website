import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { FilterSidebar } from "@/components/catalogue/FilterSidebar";
import { ProductGrid } from "@/components/catalogue/ProductGrid";
import { getProducts } from "@/lib/products/queries";
import type { ProductCategory, ProductFilters, ProductFinish } from "@/types/product";

export const metadata: Metadata = {
  title: "Catalogue",
  description:
    "Browse D R Traders' full collection of marble slabs, granite slabs, GVT tiles, and bathroom tiles.",
};

const CATEGORY_VALUES: readonly ProductCategory[] = [
  "Marble Slabs",
  "Granite Slabs",
  "GVT Tiles",
  "Bathroom Tiles",
];
const FINISH_VALUES: readonly ProductFinish[] = ["Polished", "Honed", "Matte", "Leathered"];

function toList(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
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

  // Pagination (task 8) is a small addition on top of this — request every
  // matching row now rather than build page controls twice.
  const { products, total } = await getProducts(filters, 1, 100);

  return (
    <>
      <Navbar variant="light" />
      <main className="pt-16 md:pt-20">
        <section className="py-section-gap">
          <Container>
            <div className="mb-10 md:mb-12 max-w-2xl">
              <p className="mb-4 font-body text-label uppercase tracking-widest text-secondary">
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
              <FilterSidebar filters={filters} resultCount={total} />
              <ProductGrid products={products} />
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
