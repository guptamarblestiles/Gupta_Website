/**
 * "Who We Are" — company overview replacing the old product-showcase
 * homepage sections (CategoryRow/FeaturedCollection). Pure content, no
 * product data, per the content-focused homepage redesign.
 */
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";

export function BusinessOverview() {
  return (
    <RevealOnScroll>
      <section className="bg-background py-section-gap">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-12">
            <div className="lg:col-start-2 lg:col-span-7">
              <div className="mb-4 flex items-center gap-3">
                <span className="h-px w-8 md:w-12 bg-on-surface" aria-hidden="true" />
                <p className="font-body text-label uppercase text-secondary-strong">Who We Are</p>
              </div>
              <h2 className="font-display text-headline-mobile md:text-headline-tablet lg:text-headline text-on-surface mb-6">
                Architectural Surfaces for <em className="italic text-secondary">Visionary</em> Spaces
              </h2>
              <p className="font-body text-body-lg text-on-surface-variant leading-relaxed mb-10 max-w-xl">
                At Gupta Interior, we source and curate the world&apos;s most exceptional
                marble and stone. With 25+ years of expertise, we&apos;ve transformed thousands of
                projects across residential, commercial, and hospitality sectors. Visit our showroom
                in Mangolpur Kalan, Rohini, serving homeowners and architects across Delhi NCR.
              </p>
              <Button href="/tiles" variant="secondary" size="lg">
                Explore Our Range
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </RevealOnScroll>
  );
}
