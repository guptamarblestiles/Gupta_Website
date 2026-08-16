import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { CatalogueBrowser } from "@/components/catalogue/CatalogueBrowser";

const CATALOGUE_TITLE = "Catalogue";
const CATALOGUE_DESCRIPTION =
  "Browse Gupta's full collection of marble slabs, granite slabs, GVT tiles, and bathroom tiles.";

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

type ProductsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;

  return (
    <>
      <Navbar variant="light" />
      <main id="main-content" className="pt-16 md:pt-20">
        <section className="py-section-gap">
          <Container>
            <div className="mb-10 md:mb-12 max-w-2xl">
              <p className="mb-4 font-body text-label uppercase tracking-widest text-secondary-strong">
                Catalogue
              </p>
              <h1 className="font-display text-headline-mobile md:text-headline-tablet lg:text-headline text-on-surface">
                The Full Collection
              </h1>
              <p className="mt-4 font-body text-body-lg text-on-surface-variant">
                Marble, granite, GVT, and bathroom surfaces curated for architectural spaces.
              </p>
            </div>

            <CatalogueBrowser basePath="/products" params={params} />
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
