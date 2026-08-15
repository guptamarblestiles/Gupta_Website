"use client";

import { useState } from "react";
import Image from "next/image";
import { StoneSwatch, type StoneType } from "@/components/ui/StoneSwatch";
import { cn } from "@/lib/utils/cn";

const SYNTHETIC_VIEWS = [
  { label: "Full Slab", scale: 1, position: "50% 50%" },
  { label: "Vein Detail", scale: 1.8, position: "30% 40%" },
  { label: "Edge Profile", scale: 1.4, position: "80% 20%" },
  { label: "In Natural Light", scale: 1.2, position: "60% 70%" },
] as const;

type GalleryImage = {
  url: string;
  alt: string;
};

type ImageGalleryProps = {
  stone: StoneType;
  productName: string;
  /** Real photos from product_images (live Supabase data), ordered by
   *  sort_order. When omitted/empty (mock data), falls back to a
   *  StoneSwatch placeholder at a few different scales/focal points. */
  images?: GalleryImage[];
};

export function ImageGallery({ stone, productName, images }: ImageGalleryProps) {
  const [active, setActive] = useState(0);

  if (images && images.length > 0) {
    const current = images[Math.min(active, images.length - 1)];

    return (
      <div className="flex flex-col gap-4">
        <div className="relative aspect-square overflow-hidden bg-surface-variant">
          <Image
            src={current.url}
            alt={current.alt || productName}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
            priority
          />
        </div>

        {images.length > 1 && (
          <div className="grid grid-cols-4 gap-3">
            {images.map((image, index) => (
              <button
                key={`${image.url}-${index}`}
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Show ${productName} — image ${index + 1} of ${images.length}`}
                aria-pressed={active === index}
                className={cn(
                  "relative aspect-square overflow-hidden border-2 transition-colors",
                  active === index
                    ? "border-secondary"
                    : "border-transparent hover:border-outline-variant",
                )}
              >
                <Image src={image.url} alt="" fill sizes="120px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const view = SYNTHETIC_VIEWS[active];

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-square overflow-hidden bg-surface-variant">
        <StoneSwatch
          stone={stone}
          className="absolute inset-0 h-full w-full transition-transform duration-500 ease-out"
          style={{ transform: `scale(${view.scale})`, transformOrigin: view.position }}
        />
        <p className="absolute bottom-4 left-4 font-body text-label uppercase tracking-widest text-white/90 drop-shadow">
          {view.label}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {SYNTHETIC_VIEWS.map((v, index) => (
          <button
            key={v.label}
            type="button"
            onClick={() => setActive(index)}
            aria-label={`Show ${productName} — ${v.label}`}
            aria-pressed={active === index}
            className={cn(
              "relative aspect-square overflow-hidden border-2 transition-colors",
              active === index ? "border-secondary" : "border-transparent hover:border-outline-variant",
            )}
          >
            <StoneSwatch
              stone={stone}
              className="absolute inset-0 h-full w-full"
              style={{ transform: `scale(${v.scale})`, transformOrigin: v.position }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
