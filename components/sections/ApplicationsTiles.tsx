/**
 * Applications showcase — fetches real room photos (lib/media/tileImages)
 * server-side, keeping the existing Residential/Commercial/Hospitality
 * copy unchanged, and hands off to ApplicationsCarousel (client) for the
 * interactive dominant/prev/next carousel + the small 3D tile element.
 * Falls back to the original plain icon-card grid if no images are found
 * (e.g. Supabase not configured), rather than rendering a broken carousel.
 */
import { Building2, Home, UtensilsCrossed } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { getApplicationImages } from "@/lib/media/tileImages";
import { ApplicationsCarousel } from "./ApplicationsCarousel";

const APPLICATIONS = [
  {
    icon: Home,
    title: "Residential",
    description: "Kitchen countertops, bathroom walls, and living room floors finished in stone.",
  },
  {
    icon: Building2,
    title: "Commercial",
    description: "Lobbies, office floors, and facades built for daily wear without losing polish.",
  },
  {
    icon: UtensilsCrossed,
    title: "Hospitality",
    description: "Hotel lobbies, restaurant interiors, and spa spaces finished to a five-star standard.",
  },
];

export async function ApplicationsTiles() {
  const images = await getApplicationImages();
  const hasImages = images.length === APPLICATIONS.length;

  return (
    <RevealOnScroll>
      <section className="bg-surface-variant py-section-gap overflow-hidden">
        <Container>
          <div className="mb-12 md:mb-16 max-w-2xl mx-auto text-center">
            <p className="font-body text-label uppercase tracking-widest text-secondary-strong mb-4">
              Where It Goes
            </p>
            <h2 className="font-display text-headline-mobile md:text-headline-tablet lg:text-headline text-on-surface">
              Applications
            </h2>
          </div>

          {hasImages ? (
            <ApplicationsCarousel
              items={APPLICATIONS.map(({ title, description }, i) => ({
                title,
                description,
                imageUrl: images[i].imageUrl,
              }))}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-gutter">
              {APPLICATIONS.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="flex flex-col items-center text-center bg-surface p-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                    <Icon size={22} aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-headline-sm-mobile md:text-headline-sm text-on-surface mb-2">
                    {title}
                  </h3>
                  <p className="font-body text-body text-on-surface-variant leading-relaxed">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Container>
      </section>
    </RevealOnScroll>
  );
}
