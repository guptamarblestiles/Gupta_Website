/**
 * AR-lite tile visualizer (Part 5): pick a space type + preset room, then a
 * product from the catalogue, and see its texture perspective-warped onto
 * the room's floor/wall plane client-side (components/visualizer/*). Fetches
 * an initial slice of the catalogue server-side for the tile picker — see
 * VisualizerApp for why full catalogue search isn't wired in here.
 */
import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { VisualizerApp } from "@/components/visualizer/VisualizerApp";
import { getProducts } from "@/lib/products/queries";

export const metadata: Metadata = {
  title: "Tile Visualizer",
  description: "See Gupta's tiles warped onto real room presets before you buy.",
};

export default async function VisualizerPage() {
  const { products } = await getProducts({}, 1, 60);

  return (
    <>
      <Navbar variant="light" />
      <main id="main-content" className="pt-16 md:pt-20">
        <section className="py-section-gap">
          <Container>
            <div className="mb-10 md:mb-12 max-w-2xl">
              <p className="mb-4 font-body text-label uppercase tracking-widest text-secondary-strong">
                Visualizer
              </p>
              <h1 className="font-display text-headline-mobile md:text-headline-tablet lg:text-headline text-on-surface">
                See It In The Space
              </h1>
              <p className="mt-4 font-body text-body-lg text-on-surface-variant">
                Pick a space, a room, and a tile — preview it warped onto the surface before you
                commit.
              </p>
            </div>

            <VisualizerApp products={products} />
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
