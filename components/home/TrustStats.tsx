import { Container } from "@/components/ui/Container";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { getProductCount } from "@/lib/products/queries";

/**
 * Trust Stats band. Also serves as the page's "About" anchor target
 * (Navbar's "About" link points to "/#about").
 *
 * Every figure here is independently verifiable from the codebase/live
 * data — no invented "5,000+ Projects Delivered", "04 Premium Showrooms",
 * or "ISO Certified" claims (the previous version of this section had all
 * three, none traceable to any real record). "25+ Years" and the single
 * real Delhi showroom address are confirmed facts on file; the catalogue
 * size is a live count, not a hand-typed number that can go stale.
 */
export async function TrustStats() {
  const productCount = await getProductCount();
  const stats = [
    { value: "25+", label: "Years in Business" },
    { value: `${productCount}+`, label: "Tiles & Stone in Catalogue" },
    { value: "1", label: "Showroom in Delhi" },
    { value: "Mon–Sat", label: "Open for Showroom Visits" },
  ];

  return (
    <RevealOnScroll>
      <section id="about" className="bg-background py-section-gap scroll-mt-20">
        <Container>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter divide-y divide-outline-variant md:divide-y-0 md:divide-x">
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className={`flex flex-col items-center text-center px-4 ${i < 2 ? "pb-8 md:pb-0" : "pt-8 md:pt-0"}`}
              >
                <span className="font-display text-headline-mobile md:text-headline-tablet lg:text-headline text-secondary-strong mb-2">
                  {stat.value}
                </span>
                <span className="font-body text-label text-on-surface-variant uppercase">
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
