import { Container } from "@/components/ui/Container";

/** Catalogue loading skeleton — mirrors the /tiles page header + grid so
 *  navigation never shows a blank screen. Server component, no JS. */
export default function TilesLoading() {
  return (
    <main id="main-content" className="pt-16 md:pt-20" aria-busy="true">
      <section className="py-section-gap">
        <Container>
          <span className="sr-only" role="status">
            Loading catalogue
          </span>
          <div className="mb-10 md:mb-12 max-w-2xl animate-pulse">
            <div className="mb-4 h-3 w-24 bg-outline-variant" />
            <div className="h-10 w-3/4 bg-outline-variant" />
            <div className="mt-4 h-4 w-full bg-outline-variant" />
          </div>
          <div className="lg:flex lg:items-start lg:gap-gutter">
            <div className="hidden lg:block w-64 shrink-0 h-96 animate-pulse bg-outline-variant/40" />
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-gutter">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse" aria-hidden="true">
                  <div className="aspect-square bg-outline-variant/60" />
                  <div className="mt-4 h-4 w-2/3 bg-outline-variant/60" />
                  <div className="mt-2 h-3 w-1/3 bg-outline-variant/40" />
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
