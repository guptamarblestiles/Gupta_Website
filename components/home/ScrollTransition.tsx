/**
 * Cinematic scroll-zoom quote section: fetches a real marble slab photo
 * from the database (lib/media/tileImages.ts — not a hardcoded URL) and,
 * as the user scrolls through this pinned section, continuously zooms
 * into it (GPU-only transforms: scale + opacity, no layout-triggering
 * properties) so the material itself fills the screen before dissolving
 * into the white section that follows. Server Component fetches the
 * image; QuoteZoomClient (below) owns the actual scroll-linked animation
 * since useScroll/useTransform need a client boundary.
 *
 * Falls back to a plain dark quote panel (no image, no animation) if the
 * curated product/image isn't found — see getSlabTextureImage.
 */
import { getSlabTextureImage } from "@/lib/media/tileImages";
import { QuoteZoomClient } from "./QuoteZoomClient";

export async function ScrollTransition() {
  const slab = await getSlabTextureImage();

  if (!slab) {
    return (
      <section className="flex h-64 w-full items-center justify-center bg-hero-bg px-margin">
        <p className="font-display text-headline-sm md:text-headline max-w-2xl text-center leading-snug text-hero-foreground">
          From quarry to craftsmanship — every slab carries the story of the earth it came from.
        </p>
      </section>
    );
  }

  return <QuoteZoomClient imageUrl={slab.imageUrl} imageAlt={slab.name} />;
}
