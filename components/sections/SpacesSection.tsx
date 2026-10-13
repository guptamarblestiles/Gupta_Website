import { Container } from "@/components/ui/Container";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { SpaceCard, type SpaceClip } from "./SpaceCard";

const SPACES: { title: string; href: string; clips: SpaceClip[] }[] = [
  {
    title: "Interior",
    href: "/products",
    clips: [
      { src: "/videos/spaces/interior-01.mp4", poster: "/videos/spaces/interior-01.jpg" },
      { src: "/videos/spaces/interior-02.mp4", poster: "/videos/spaces/interior-02.jpg" },
    ],
  },
  {
    title: "Exterior",
    href: "/products",
    clips: [{ src: "/videos/spaces/exterior-01.mp4", poster: "/videos/spaces/exterior-01.jpg" }],
  },
  {
    title: "Washroom",
    href: "/products",
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
              Spaces
            </h2>
            <p className="font-body text-body-lg text-on-surface-variant">
              Real finishes, in real rooms — explore where our materials go to work.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
            {SPACES.map((space) => (
              <SpaceCard key={space.title} title={space.title} href={space.href} clips={space.clips} />
            ))}
          </div>
        </Container>
      </section>
    </RevealOnScroll>
  );
}
