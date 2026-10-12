/**
 * "Explore by Category" — image-led discovery grid built from the five
 * real, verified collections in lib/collections.ts (Wall/Floor/Porcelain/
 * Glossy/Matt), each backed by a genuine non-empty product_count. No
 * invented categories (no "Bathroom Fittings", "Kitchen Surfaces", etc.) —
 * those aren't in the actual catalogue, see lib/collections.ts's own note
 * on why. Each card's photo is a real product image from that collection,
 * fetched live, not a placeholder.
 */
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { getProducts } from "@/lib/products/queries";
import { COLLECTIONS } from "@/lib/collections";

async function getCategoryPreview(filters: (typeof COLLECTIONS)[number]["filters"]) {
  const { products } = await getProducts(filters, 1, 1);
  return products[0]?.imageUrl || undefined;
}

export async function CategoriesSection() {
  const previews = await Promise.all(
    COLLECTIONS.map((c) => getCategoryPreview(c.filters)),
  );
  const categories = COLLECTIONS.map((c, i) => ({ ...c, imageUrl: previews[i] }));

  return (
    <RevealOnScroll>
      <section className="bg-background py-section-gap">
        <Container>
          <div className="mb-12 md:mb-16 max-w-2xl">
            <p className="font-body text-label text-secondary-strong mb-3 uppercase">
              Explore By Category
            </p>
            <h2 className="font-display text-headline-mobile md:text-headline-tablet lg:text-headline text-on-surface">
              Find the right surface for your space
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
            {categories.map((category, i) => (
              <Link
                key={category.slug}
                href={`/collections/${category.slug}`}
                className={cardClass(i)}
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-surface-variant">
                  {category.imageUrl ? (
                    <Image
                      src={category.imageUrl}
                      alt={`${category.name} at Gupta Interior`}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="image-hover-zoom object-cover"
                    />
                  ) : null}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <h3 className="font-display text-headline-sm-mobile md:text-headline-sm-tablet text-on-surface">
                    {category.name}
                  </h3>
                  <span className="font-body text-label text-secondary-strong">View →</span>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>
    </RevealOnScroll>
  );
}

/** First card spans two columns on large screens for a varied, editorial
 *  grid rather than uniform repeating rectangles. */
function cardClass(index: number): string {
  const base = "group block";
  return index === 0 ? `${base} lg:col-span-2` : base;
}
