/**
 * "Who We Are" — company overview. Content/copy is unchanged from the
 * previous version (see the integration report for which specific claims
 * — "25+ years", "thousands of projects", the showroom location — remain
 * unverified, carried over as-is, not newly added here). Only the layout
 * changed: the image below the copy now grows from a small rounded frame
 * to full width as the user scrolls past this section (AboutScrollImage,
 * the one client boundary this section needs).
 */
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { AboutScrollImage } from "./AboutScrollImage";

const IMAGE_SRC = "/images/about/about-hallway-2400.webp";
const IMAGE_ALT = "Grey marble tile floor in a modern hallway";

export function BusinessOverview() {
  return (
    <RevealOnScroll>
      <section className="bg-background py-section-gap">
        <Container>
          <AboutScrollImage
            imageSrc={IMAGE_SRC}
            imageAlt={IMAGE_ALT}
            label="Showroom"
            exploreHref="/tiles"
          >
            <div className="mb-3 flex items-center justify-center gap-3">
              <span className="h-px w-8 md:w-12 bg-on-surface" aria-hidden="true" />
              <p className="font-body text-label uppercase text-secondary-strong">Who We Are</p>
            </div>
            <h2 className="font-display text-headline-mobile md:text-headline-tablet lg:text-headline text-on-surface mb-4">
              Architectural Surfaces for <em className="italic text-secondary">Visionary</em> Spaces
            </h2>
            <p className="font-body text-body-lg text-on-surface-variant leading-relaxed mb-6">
              At Gupta Interior, we source and curate the world&apos;s most exceptional
              marble and stone. With 25+ years of expertise, we&apos;ve transformed thousands of
              projects across residential, commercial, and hospitality sectors. Visit our showroom
              in Mangolpur Kalan, Rohini, serving homeowners and architects across Delhi NCR.
            </p>
            <Button href="/tiles" variant="secondary" size="lg">
              Explore Our Range
            </Button>
          </AboutScrollImage>
        </Container>
      </section>
    </RevealOnScroll>
  );
}
