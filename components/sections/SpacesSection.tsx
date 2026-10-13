import { Container } from "@/components/ui/Container";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { SpaceCard, type SpaceClip } from "./SpaceCard";

/**
 * Explore link targets — checked live against the catalogue (Supabase)
 * before picking these. `application` is only ever "Wall" or null, and
 * `rooms` is empty for all but 5 products (tagged "Kitchen" only) — no
 * data distinguishes "Interior" or "Washroom" use, so those two fall back
 * to the unfiltered catalogue rather than faking a filter. "Exterior" does
 * have a real match: category "16X16 PARKING TILES" is genuinely an
 * outdoor/exterior product line (verified live: 40 products, 12+ shown on
 * page 1 of /tiles?category=16X16+PARKING+TILES).
 */
const SPACES: { title: string; caption: string; href: string; clips: SpaceClip[] }[] = [
  {
    title: "Interior",
    caption: "Floors and walls for living rooms, bedrooms and hallways.",
    // TODO: make this a filtered link once products are tagged by space —
    // no real "interior" filter value exists in the catalogue today.
    href: "/tiles",
    clips: [
      { src: "/videos/spaces/interior-01.mp4", poster: "/videos/spaces/interior-01.jpg" },
      { src: "/videos/spaces/interior-02.mp4", poster: "/videos/spaces/interior-02.jpg" },
    ],
  },
  {
    title: "Exterior",
    caption: "Weather-ready tile for patios, facades and courtyards.",
    href: "/tiles?category=16X16+PARKING+TILES",
    clips: [{ src: "/videos/spaces/exterior-01.mp4", poster: "/videos/spaces/exterior-01.jpg" }],
  },
  {
    title: "Washroom",
    caption: "Tile for bathrooms and wet areas, from vanity walls to floors.",
    // TODO: make this a filtered link once products are tagged by space —
    // no real "washroom"/bathroom filter value exists in the catalogue today.
    href: "/tiles",
    clips: [{ src: "/videos/spaces/washroom-01.mp4", poster: "/videos/spaces/washroom-01.jpg" }],
  },
];

/**
 * "Spaces" — three large video cards (Interior/Exterior/Washroom), each
 * playing real footage on hover/focus (desktop) or while in view (touch).
 * Stays a Server Component; SpaceCard is the one client boundary for the
 * hover/IntersectionObserver logic.
 */
export function SpacesSection() {
  return (
    <RevealOnScroll>
      <section className="bg-background py-section-gap">
        <Container>
          <div className="mb-12 md:mb-16 max-w-2xl mx-auto text-center">
            <h2 className="font-display text-headline-mobile md:text-headline-tablet lg:text-headline text-on-surface mb-4">
              Surfaces for Every Room, Made to Last.
            </h2>
            <p className="font-body text-body-lg text-on-surface-variant">
              Marble and tile for the places you live, host and unwind in.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
            {SPACES.map((space) => (
              <SpaceCard
                key={space.title}
                title={space.title}
                caption={space.caption}
                href={space.href}
                clips={space.clips}
              />
            ))}
          </div>
        </Container>
      </section>
    </RevealOnScroll>
  );
}
