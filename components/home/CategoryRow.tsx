import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { StoneSwatch } from "@/components/ui/StoneSwatch";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { CATEGORY_SHOWCASE } from "@/lib/products/mockProducts";

/**
 * Homepage "Category row" — first light-theme section, immediately
 * orienting a new visitor toward the four top-level ways into the
 * catalogue (brief section 2, objective #2 "explore the catalogue").
 * Pure CSS hover treatment keeps this a Server Component.
 */
export function CategoryRow() {
  return (
    <RevealOnScroll>
      <section className="bg-background py-section-gap">
        <Container>
          <div className="mb-12 md:mb-16 max-w-2xl">
            <p className="font-body text-label uppercase tracking-widest text-secondary-strong mb-4">
              The Collection
            </p>
            <h2 className="font-display text-headline-mobile md:text-headline-tablet lg:text-headline text-on-surface">
              Explore by category
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter">
            {CATEGORY_SHOWCASE.map((cat) => (
              <Link
                key={cat.category}
                href={cat.href}
                className="group flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary rounded-sm"
              >
                <div className="relative aspect-[4/5] overflow-hidden mb-4">
                  <StoneSwatch
                    stone={cat.stone}
                    className="absolute inset-0 h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-black/0 transition-opacity duration-500 group-hover:opacity-70" />
                </div>
                <h3 className="font-display text-headline-sm-mobile md:text-headline-sm-tablet lg:text-headline-sm text-on-surface mb-1">
                  {cat.label}
                </h3>
                <p className="font-body text-body text-on-surface-variant mb-3 leading-relaxed">
                  {cat.description}
                </p>
                <span className="inline-flex items-center gap-1.5 font-body text-label uppercase tracking-widest text-on-surface-variant transition-colors duration-300 group-hover:text-secondary">
                  View Collection
                  <ArrowUpRight
                    size={14}
                    className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>
    </RevealOnScroll>
  );
}
