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
        <Container className="max-w-3xl text-center mx-auto">
          <p className="font-body text-label uppercase tracking-widest text-secondary-strong mb-4">
            Who We Are
          </p>
          <h2 className="font-display text-headline-mobile md:text-headline-tablet lg:text-headline text-on-surface mb-6">
            Architectural Surfaces for Visionary Spaces
          </h2>
          <p className="font-body text-body-lg text-on-surface-variant leading-relaxed mb-10">
            At Gupta Marbles &amp; Tiles, we source and curate the world&apos;s most exceptional
            marble and stone. With 25+ years of expertise, we&apos;ve transformed thousands of
            projects across residential, commercial, and hospitality sectors.
          </p>
          <Button href="/tiles" variant="secondary" size="lg">
            Explore Our Range
          </Button>
        </Container>
      </section>
    </RevealOnScroll>
  );
}
