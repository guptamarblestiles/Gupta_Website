import { Container } from "@/components/ui/Container";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { CatalogueCard } from "@/components/catalogue/CatalogueCard";
import { getVisibleCatalogues } from "@/lib/catalogues/queries";

/** "Explore Our Catalogue" — lets the public site show fewer individual
 *  products while still giving visitors the complete range via PDF. Only
 *  renders once at least one visible catalogue exists (no empty section,
 *  no placeholder cards) — see getVisibleCatalogues. */
export async function CatalogueSection() {
  const catalogues = await getVisibleCatalogues();
  if (catalogues.length === 0) return null;

  return (
    <RevealOnScroll>
      <section className="bg-surface-variant py-section-gap">
        <Container>
          <div className="mb-12 md:mb-16 max-w-2xl mx-auto text-center">
            <p className="font-body text-label uppercase tracking-widest text-secondary-strong mb-4">
              The Full Range
            </p>
            <h2 className="font-display text-headline-mobile md:text-headline-tablet lg:text-headline text-on-surface mb-4">
              Explore Our Catalogue
            </h2>
            <p className="font-body text-body-lg text-on-surface-variant leading-relaxed">
              Browse our complete range of finishes and designs in one place — download or read
              the full lookbook right here.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
            {catalogues.map((catalogue) => (
              <CatalogueCard key={catalogue.id} catalogue={catalogue} />
            ))}
          </div>
        </Container>
      </section>
    </RevealOnScroll>
  );
}
