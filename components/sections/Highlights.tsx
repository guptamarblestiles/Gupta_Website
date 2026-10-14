/**
 * Homepage "Why Gupta Interior" showcase — a 4-column bento (one column per
 * highlight: its photo + its copy, alternating which sits on top) built from
 * the curated photos in public/images/applications/ (converted from the
 * originals in assets-source/applications-originals/; see CREDITS.md there).
 * Server Component: just wires the static data and hands off to
 * HighlightsGrid (client) for the scroll reveal.
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
    stat: "25+",
  },
] as const;

export function Highlights() {
  return (
    <section className="bg-surface-variant py-14 md:py-20 overflow-x-clip">
      <Container>
        <div className="mb-10 md:mb-12 mx-auto max-w-md text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-secondary-strong" aria-hidden="true" />
            <span className="font-body text-label uppercase text-secondary-strong">Why Gupta Interior</span>
          </span>
          <h2 className="font-display text-4xl md:text-5xl text-on-surface mb-3">Highlights</h2>
          <p className="font-body text-body text-on-surface-variant">
            Quality, craftsmanship and service — the standards behind every project.
          </p>
        </div>

        <HighlightsGrid items={HIGHLIGHTS} />
      </Container>
    </section>
  );
}
