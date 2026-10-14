/**
 * Applications showcase — editorial scroll-reveal built from the curated
 * photos in public/images/applications/ (static, not database-driven; see
 * CREDITS.md in that folder). Replaces the old carousel + 3D tile element.
 *
 * "View Tiles for This" links all go to the unfiltered catalogue for now —
 * see the TODO on each row below for why (no real per-space filter data
 * exists yet; faking one would misrepresent the catalogue).
 */
import { Container } from "@/components/ui/Container";
import { ApplicationRow } from "./ApplicationRow";
import { ApplicationsCollage } from "./ApplicationsCollage";

const ROWS = [
  {
    number: "01",
    title: "Homes",
    description: "Kitchens, bedrooms, bathrooms and living areas.",
    // TODO: filter by room/space once products are tagged that way — no
    // such tagging exists in the catalogue yet (checked live: `rooms` is
    // only ever populated with "Kitchen", for 5 of 548 products).
    href: "/tiles",
    imageSrc: "/images/applications/home-bedroom-travertine-wall.webp",
    imageAlt: "Travertine feature wall in a bedroom",
    secondaryImage: {
      src: "/images/applications/home-kitchen-marble-island.webp",
      alt: "Marble kitchen island",
    },
    imageOnRight: false,
  },
  {
    number: "02",
    title: "Buildings",
    description: "Lobbies, offices and commercial floors.",
    // TODO: filter by space once products are tagged — no commercial/
    // office/lobby tagging exists in the catalogue at all today.
    href: "/tiles",
    imageSrc: "/images/applications/building-lobby-stone-floor.webp",
    imageAlt: "Lobby with a large-format stone-look floor and floor-to-ceiling glass",
    secondaryImage: {
      src: "/images/applications/building-lobby-glass-wood-panels.webp",
      alt: "Office lobby with a glossy floor and wood-panelled walls",
    },
    imageOnRight: true,
  },
  {
    number: "03",
    title: "Hospitality",
    description: "Restaurants, cafes, hotels and spas.",
    // TODO: filter by space once products are tagged — no restaurant/
    // hotel/spa tagging exists in the catalogue at all today.
    href: "/tiles",
    imageSrc: "/images/applications/hospitality-lobby-inlaid-marble.webp",
    imageAlt: "Hotel lobby with an inlaid marble floor",
    imageObjectPosition: "center 70%",
    secondaryImage: {
      src: "/images/applications/hospitality-cafe-stone-brick.webp",
      alt: "Stone and brick walls in a café",
    },
    imageOnRight: false,
  },
] as const;

export function ApplicationsTiles() {
  return (
    <section className="bg-surface-variant py-section-gap overflow-x-clip">
      <Container>
        <div className="mb-16 md:mb-24 max-w-3xl">
          <p className="font-body text-label uppercase text-secondary-strong mb-4">Where It Goes</p>
          <h2 className="font-display text-display-mobile md:text-display-tablet lg:text-display text-on-surface">
            Made for Every Space.
          </h2>
        </div>

        <div className="flex flex-col gap-24 md:gap-32">
          {ROWS.map((row) => (
            <ApplicationRow key={row.number} {...row} />
          ))}
        </div>

        <div className="mt-24 md:mt-32">
          <ApplicationsCollage />
        </div>
      </Container>
    </section>
  );
}
