/**
 * "A Closer Look" — honest substitute for a fabricated Projects/Gallery
 * section. The codebase has no real completed-project photography and no
 * project records in the database at all (no `projects` table), so this
 * section shows real material close-ups instead of inventing client case
 * studies, fake locations, or project statistics.
 *
 * Pulls a handful of real, varied products with photography straight from
 * the live catalogue (one per distinct category, so the mix stays visually
 * varied) and captions them with their own true name/category/finish —
 * never an invented project name or client.
 *
 * SWAP-IN POINT: once real completed-project photography exists, replace
 * this section (or extend it) with a dedicated Projects section backed by
 * real project records — this file is intentionally the only place that
 * needs to change.
 */
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { getProducts } from "@/lib/products/queries";
import type { Product } from "@/types/product";

/** "DR TILE" (singular) deliberately excluded — it's the unresolved PDF-
 *  extraction bucket (slugs like "dr-tile-unknown-page-NN") and would
 *  surface an internal product name like "Unknown Page 89" here. */
const FEATURED_CATEGORIES = ["Porcelain Tiles", "Wall Tiles", "GLOSSY 11", "16X16 PARKING TILES"];

async function getFeaturedProducts(): Promise<Product[]> {
  const results = await Promise.all(
    FEATURED_CATEGORIES.map(async (category) => {
      const { products } = await getProducts({ category: [category] }, 1, 1);
      return products[0];
    }),
  );
  return results.filter((p): p is Product => Boolean(p?.imageUrl));
}

export async function MaterialStoriesSection() {
  const products = await getFeaturedProducts();
  if (products.length === 0) return null;

  return (
    <RevealOnScroll>
      <section className="bg-surface-variant py-section-gap">
        <Container>
          <div className="mb-12 md:mb-16 max-w-2xl flex items-end justify-between flex-wrap gap-6">
            <div>
              <p className="font-body text-label text-secondary-strong mb-3 uppercase">
                A Closer Look
              </p>
              <h2 className="font-display text-headline-mobile md:text-headline-tablet lg:text-headline text-on-surface">
                Real materials, real texture
              </h2>
            </div>
            <Link
              href="/products"
              className="font-body text-label text-secondary-strong hover:text-on-surface transition-colors duration-200"
            >
              View Full Catalogue →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-gutter">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="group block"
              >
                <div className="relative aspect-[5/4] overflow-hidden rounded-sm bg-surface">
                  <Image
                    src={product.imageUrl}
                    alt={`${product.name} — ${product.category}`}
                    fill
                    sizes="(min-width: 640px) 50vw, 100vw"
                    className="image-hover-zoom object-cover"
                  />
                </div>
                <div className="mt-4">
                  <h3 className="font-display text-headline-sm-mobile text-on-surface">
                    {product.name}
                  </h3>
                  <p className="font-body text-body text-on-surface-variant">
                    {product.category}
                    {product.finish ? ` · ${product.finish}` : ""}
                    {product.size ? ` · ${product.size}` : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>
    </RevealOnScroll>
  );
}
