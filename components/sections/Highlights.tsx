/**
 * Homepage "Why Gupta Interior" showcase — a bento grid mixing curated
 * photos (public/images/applications/, converted from the originals in
 * assets-source/applications-originals/; see CREDITS.md there) with the
 * four Highlights copy blocks. Server Component: just wires the static
 * data and hands off to HighlightsGrid (client) for the scroll reveal.
 */
import { Container } from "@/components/ui/Container";
import { HighlightsGrid } from "./HighlightsGrid";

const HIGHLIGHTS = [
  {
    title: "Premium Materials",
    description: "Sourced from trusted quarries and suppliers, selected slab by slab.",
    imageSrc: "/images/applications/highlight-premium-materials.webp",
    imageAlt: "Living room feature wall clad in veined marble, with floating wood shelving",
  },
  {
    title: "Certified Quality",
    description: "Durability-tested surfaces that hold up to daily commercial and residential use.",
    imageSrc: "/images/applications/highlight-certified-quality.webp",
    imageAlt: "Marble-tiled bathroom with a freestanding tub and mosaic floor",
  },
  {
    title: "Custom Solutions",
    description: "Finishes and sizing tailored to your project's exact requirements.",
    imageSrc: "/images/applications/highlight-custom-solutions.webp",
    imageAlt: "Modern kitchen with a dark veined-marble countertop and marble flooring",
  },
  {
    title: "Expert Support",
    description: "25+ years of industry experience guiding every selection.",
    imageSrc: "/images/applications/highlight-expert-support.webp",
    imageAlt: "Minimalist living room with a plastered feature wall and floor lamp",
  },
] as const;

export function Highlights() {
  return (
    <section className="bg-background py-section-gap overflow-x-clip">
      <Container>
        <div className="mb-12 md:mb-16 max-w-2xl mx-auto text-center">
          <p className="font-body text-label uppercase text-secondary-strong mb-4">
            Why Gupta Interior
          </p>
          <h2 className="font-display text-headline-mobile md:text-headline-tablet lg:text-headline text-on-surface">
            Highlights
          </h2>
        </div>

        <HighlightsGrid items={HIGHLIGHTS} />
      </Container>
    </section>
  );
}
