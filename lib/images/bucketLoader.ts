import type { ImageLoaderProps } from "next/image";

/**
 * Vercel counts every unique (source, width, quality) as one "image
 * transformation" (Hobby: 5,000 per 30 days; over that, new variants return
 * 402 OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED). The default loader asks for
 * up to 7 widths per image, but the stored tile files are only ~600-1000px
 * wide and the optimizer never enlarges, so the big widths are duplicate
 * transformations of the same pixels.
 *
 * This loader snaps whatever width the browser asks for to the smallest
 * allowed bucket that covers it (or the largest bucket), so each image is
 * transformed at most `buckets.length` times. Buckets MUST be present in
 * next.config.ts `images.deviceSizes` / `images.imageSizes`, or the
 * optimizer rejects the request.
 */
export function createBucketLoader(buckets: readonly number[]) {
  const sorted = [...buckets].sort((a, b) => a - b);
  if (sorted.length === 0) throw new Error("createBucketLoader needs at least one bucket");

  return function bucketLoader({ src, width, quality }: ImageLoaderProps): string {
    const bucket = sorted.find((w) => w >= width) ?? sorted[sorted.length - 1];
    return `/_next/image?url=${encodeURIComponent(src)}&w=${bucket}&q=${quality ?? 75}`;
  };
}

/** Catalogue grid cards (about 300-640 CSS px wide). */
export const cardLoader = createBucketLoader([384, 828]);
/** Product gallery main image (shown at up to 50vw, zoomable). */
export const galleryLoader = createBucketLoader([828, 1080]);
/** Small thumbnails (<= 128 CSS px). */
export const thumbLoader = createBucketLoader([384]);
