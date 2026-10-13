import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { SpaceCard, type SpaceClip } from "./SpaceCard";

/** Copy lives here as named constants, not inline JSX, so it's a one-line
 *  edit later rather than a hunt through markup. */
const HEADING = "Surfaces for Every Room, Made to Last.";
const SUBTITLE = "Marble and tile for the places you live, host and unwind in.";

/**
 * Explore link targets — see the catalogue's real filter data before
 * changing these. Only "16X16 PARKING TILES" is a genuine, verified,
 * non-empty category that maps to outdoor/exterior use (checked live:
 * 40 products). Nothing in the catalogue is tagged for "interior" in
 * general or for bathroom/washroom use at all (`rooms` only ever has
 * "Kitchen" tagged, there is no bathroom/washroom category or room
 * value anywhere in the 548 live products) — Interior and Washroom
 * link to the unfiltered catalogue rather than a fake filter. See the
 * task report for the full data check.
 */
const INTERIOR_HREF = "/tiles";
const EXTERIOR_HREF = "/tiles?category=16X16+PARKING+TILES";
const WASHROOM_HREF = "/tiles";

const SPACES: { title: string; caption: string; href: string; clips: SpaceClip[] }[] = [
  {
    title: "Interior",
    caption: "Floors and walls for living rooms, bedrooms and hallways.",
    href: INTERIOR_HREF,
    clips: [
      { src: "/videos/spaces/interior-01.mp4", poster: "/videos/spaces/interior-01.jpg" },
      { src: "/videos/spaces/interior-02.mp4", poster: "/videos/spaces/interior-02.jpg" },
    ],
  },
  {
    title: "Exterior",
    caption: "Weather-ready tile for patios, facades and courtyards.",
    href: EXTERIOR_HREF,
    clips: [{ src: "/videos/spaces/exterior-01.mp4", poster: "/videos/spaces/exterior-01.jpg" }],
  },
  {
    title: "Washroom",
    caption: "Tile for bathrooms and wet areas, from vanity walls to floors.",
    href: WASHROOM_HREF,
    clips: [{ src: "/videos/spaces/washroom-01.mp4", poster: "/videos/spaces/washroom-01.jpg" }],
  },
];

/**
 * Homepage section right after the hero: a heading + "All Surfaces" pill
 * on one row, then three large hover-video cards (Interior/Exterior/
 * Washroom). Replaces the old full-screen scroll-zoom "From quarry to
 * craftsmanship" section entirely.
 */
export function SpacesSection() {
  return (
    <RevealOnScroll>
      <section className="bg-background py-section-gap">
        <Container>
          <div className="mb-10 md:mb-12 flex flex-wrap items-end justify-between gap-6">
            <div>
              <h2 className="font-display text-headline-mobile md:text-headline-tablet lg:text-headline text-on-surface mb-4 max-w-2xl">
                {HEADING}
              </h2>
              <p className="font-body text-body-lg text-on-surface-variant">{SUBTITLE}</p>
            </div>

            <Link
              href="/tiles"
              className="group inline-flex items-center gap-3 rounded-full bg-on-surface py-1.5 pl-5 pr-1.5 font-body text-label text-white transition-colors duration-300 hover:bg-secondary-strong"
            >
              All Surfaces
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-on-surface transition-transform duration-300 group-hover:translate-x-0.5">
                <ArrowUpRight size={16} aria-hidden="true" />
              </span>
            </Link>
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
