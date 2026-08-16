/** All-products browse page — filters kept (same as /products), all
 *  products visible by default with no filter required. Shares its
 *  filter/grid/pagination implementation with /products via
 *  CatalogueBrowser rather than duplicating it. */
import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { CatalogueBrowser } from "@/components/catalogue/CatalogueBrowser";

export const metadata: Metadata = {
  title: "Tiles",
  description: "Browse every tile in the Gupta Marbles & Tiles collection.",
};

type TilesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TilesPage({ searchParams }: TilesPageProps) {
  const params = await searchParams;

  return (
    <>
      <Navbar variant="light" />
      <main id="main-content" className="pt-16 md:pt-20">
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
                Browse the full collection, or narrow it down with filters.
              </p>
            </div>

            <CatalogueBrowser basePath="/tiles" params={params} />
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
