"use client";

import { useState } from "react";
import { StoneSwatch, type StoneType } from "@/components/ui/StoneSwatch";
import { cn } from "@/lib/utils/cn";

const VIEWS = [
  { label: "Full Slab", scale: 1, position: "50% 50%" },
  { label: "Vein Detail", scale: 1.8, position: "30% 40%" },
  { label: "Edge Profile", scale: 1.4, position: "80% 20%" },
  { label: "In Natural Light", scale: 1.2, position: "60% 70%" },
] as const;

type ImageGalleryProps = {
  stone: StoneType;
  productName: string;
};

/**
 * Real photography isn't in the mock dataset yet (brief section 44 — no
 * Supabase Storage connected), so each "view" is the same StoneSwatch
 * placeholder at a different scale/focal point rather than four unrelated
 * gradients, which would misrepresent the product. Swapping in real
 * <Image src={product.images[i].imageUrl} /> per view is a one-file change
 * once Storage exists — this component's shape (an array of selectable
 * views + an active index) doesn't need to change.
 */
export function ImageGallery({ stone, productName }: ImageGalleryProps) {
  const [active, setActive] = useState(0);
  const view = VIEWS[active];

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
        {VIEWS.map((v, index) => (
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
