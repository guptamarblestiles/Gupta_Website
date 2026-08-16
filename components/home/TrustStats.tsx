import { Container } from "@/components/ui/Container";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { TRUST_STATS } from "@/lib/products/mockProducts";

/**
 * Trust Stats band. Also serves as the page's "About" anchor target
 * (Navbar's "About" link points to "/#about") — a credibility summary
 * rather than a full company-history section, matching the approved
 * Stitch homepage structure which doesn't include a separate About block.
 */
export function TrustStats() {
  return (
    <RevealOnScroll>
      <section id="about" className="bg-background py-section-gap scroll-mt-20">
        <Container>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter divide-y divide-outline-variant md:divide-y-0 md:divide-x">
            {TRUST_STATS.map((stat, i) => (
              <div
                key={stat.label}
                className={`flex flex-col items-center text-center px-4 ${i < 2 ? "pb-8 md:pb-0" : "pt-8 md:pt-0"}`}
              >
                <span className="font-display text-headline-mobile md:text-headline-tablet lg:text-headline text-secondary mb-2">
                  {stat.value}
                </span>
                <span className="font-body text-label uppercase tracking-widest text-on-surface-variant">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </RevealOnScroll>
  );
}
