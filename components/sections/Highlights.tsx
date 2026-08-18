/**
 * Image-driven Highlights showcase: fetches real room photos server-side
 * (lib/media/tileImages) and hands off to HighlightsGrid (client) for the
 * per-card scroll reveal/zoom. Falls back to the plain icon-only card
 * layout if no images are found, rather than rendering broken images.
 */
import { Container } from "@/components/ui/Container";
import { getHighlightImages } from "@/lib/media/tileImages";
import { HighlightsGrid } from "./HighlightsGrid";

const HIGHLIGHTS = [
  {
    title: "Premium Materials",
    description: "Sourced from trusted quarries and suppliers, selected slab by slab.",
  },
  {
    title: "Certified Quality",
    description: "Durability-tested surfaces that hold up to daily commercial and residential use.",
  },
  {
    title: "Custom Solutions",
    description: "Finishes and sizing tailored to your project's exact requirements.",
  },
  {
    title: "Expert Support",
    description: "25+ years of industry experience guiding every selection.",
  },
];

export async function Highlights() {
  const images = await getHighlightImages();
  const hasImages = images.length === HIGHLIGHTS.length;

  return (
    <section className="bg-background py-section-gap">
      <Container>
        <div className="mb-12 md:mb-16 max-w-2xl mx-auto text-center">
          <p className="font-body text-label uppercase tracking-widest text-secondary-strong mb-4">
            Why Gupta Interior
          </p>
          <h2 className="font-display text-headline-mobile md:text-headline-tablet lg:text-headline text-on-surface">
            Highlights
          </h2>
        </div>

        <HighlightsGrid
          items={HIGHLIGHTS.map((h, i) => ({ ...h, imageUrl: hasImages ? images[i].imageUrl : undefined }))}
        />
      </Container>
    </section>
  );
}
