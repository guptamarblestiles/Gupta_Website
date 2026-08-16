/**
 * All-products browse page — every product visible by default, no filter
 * sidebar (unlike /products), just a name/code search. Reuses ProductGrid/
 * TileCard/Pagination so styling and hover behavior match the rest of the
 * catalogue exactly.
 */
import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { ProductGrid } from "@/components/catalogue/ProductGrid";
import { Pagination } from "@/components/catalogue/Pagination";
import { TilesSearchBar } from "@/components/catalogue/TilesSearchBar";
import { getAllProducts } from "@/lib/products/queries";

export const metadata: Metadata = {
  title: "Tiles",
  description: "Browse every tile in the Gupta Marbles & Tiles collection.",
};

const PAGE_SIZE = 12;

type TilesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TilesPage({ searchParams }: TilesPageProps) {
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const requestedPage = Number.parseInt(typeof params.page === "string" ? params.page : "1", 10);
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;

  const { products, total } = await getAllProducts(search || undefined, page, PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(targetPage: number): string {
    const query = new URLSearchParams();
    if (search) query.set("q", search);
    if (targetPage > 1) query.set("page", String(targetPage));
    const qs = query.toString();
    return qs ? `/tiles?${qs}` : "/tiles";
  }

  return (
    <>
      <Navbar variant="light" />
      <main className="pt-16 md:pt-20">
        <section className="py-section-gap">
          <Container>
            <div className="mb-10 md:mb-12 max-w-2xl">
              <p className="mb-4 font-body text-label uppercase tracking-widest text-secondary-strong">
                Tiles
              </p>
              <h1 className="font-display text-headline-mobile md:text-headline-tablet lg:text-headline text-on-surface">
                Every Tile We Carry
              </h1>
              <p className="mt-4 font-body text-body-lg text-on-surface-variant">
                {total} products, no filters — just search and browse.
              </p>
            </div>

            <div className="mb-10">
              <TilesSearchBar initialValue={search} />
            </div>

            <ProductGrid products={products} />
            <Pagination
              page={page}
              totalPages={totalPages}
              prevHref={page > 1 ? pageHref(page - 1) : undefined}
              nextHref={page < totalPages ? pageHref(page + 1) : undefined}
            />
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
