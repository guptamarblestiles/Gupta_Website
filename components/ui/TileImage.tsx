"use client";

import Image, { type ImageProps } from "next/image";
import { cardLoader, galleryLoader, thumbLoader } from "@/lib/images/bucketLoader";

const LOADERS = {
  card: cardLoader,
  gallery: galleryLoader,
  thumb: thumbLoader,
} as const;

type TileImageProps = Omit<ImageProps, "loader"> & {
  /** Which width-bucket set to use; keeps transformations per image minimal. */
  variant: keyof typeof LOADERS;
};

/**
 * next/image for Supabase tile photos with a bounded number of optimizer
 * variants (see lib/images/bucketLoader.ts). Client component because the
 * `loader` function prop cannot cross the server/client boundary.
 */
export function TileImage({ variant, ...props }: TileImageProps) {
  // eslint-disable-next-line jsx-a11y/alt-text -- alt is forwarded via props
  return <Image {...props} loader={LOADERS[variant]} />;
}
