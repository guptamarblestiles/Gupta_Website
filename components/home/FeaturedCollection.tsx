import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { StoneSwatch } from "@/components/ui/StoneSwatch";
import { Button } from "@/components/ui/Button";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { FEATURED_STONES } from "@/lib/products/mockProducts";

/**
 * "The Masterpiece Selection" — curated highlight grid (approved Stitch
 * homepage content). Card micro-interactions follow brief section 18:
 * a slight lift, a soft image scale, and a "View Details" reveal — premium,
 * not flashy, done in pure CSS so the grid stays server-rendered.
 */
export function FeaturedCollection() {
  return (
    <RevealOnScroll>
      <section className="bg-surface-variant py-section-gap">
        <Container>
          <div className="mb-12 md:mb-16 max-w-2xl">
            <p className="font-body text-label uppercase tracking-widest text-secondary-strong mb-4">
              Featured
            </p>
            <h2 className="font-display text-headline md:text-display-mobile text-on-surface">
              The Masterpiece Selection
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
            {FEATURED_STONES.map((stone) => (
              <Link
                key={stone.slug}
                href={`/products/${stone.slug}`}
                className="group flex flex-col bg-surface transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
              >
                <div className="relative aspect-square overflow-hidden">
                  <StoneSwatch
                    stone={stone.stone}
                    className="absolute inset-0 h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                  />
                  <div className="absolute inset-0 flex items-end justify-start p-5 bg-gradient-to-t from-black/45 via-black/0 to-black/0 opacity-0 transition-opacity duration-400 group-hover:opacity-100">
                    <span className="font-body text-label uppercase tracking-widest text-white">
                      View Details
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-display text-headline-sm text-on-surface mb-1">
                    {stone.name}
                  </h3>
                  <p className="font-body text-body text-on-surface-variant">
                    {stone.finish} &middot; {stone.size}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-12 md:mt-16 flex justify-center">
            <Button href="/products" variant="primary" size="lg">
              View Full Catalogue
            </Button>
          </div>
        </Container>
      </section>
    </RevealOnScroll>
  );
}
