/**
 * /visualizer's client-side flow: pick a space type -> pick a room preset
 * -> pick a product -> VisualizerCanvas renders the live warped preview.
 * Product list is fetched server-side (app/visualizer/page.tsx) and passed
 * in as a prop; filtering here is a plain client-side name/code search
 * over that list — fine at this catalogue size, not meant to replace the
 * full catalogue's server-side search (lib/products/queries.ts).
 */
"use client";

import { useMemo, useState } from "react";
import { VISUALIZER_PRESETS, SPACE_TYPES, type SpaceType } from "@/lib/visualizer/presets";
import { VisualizerCanvas } from "./VisualizerCanvas";
import type { Product } from "@/types/product";
import { cn } from "@/lib/utils/cn";

type VisualizerAppProps = {
  products: Product[];
};

export function VisualizerApp({ products }: VisualizerAppProps) {
  const [spaceType, setSpaceType] = useState<SpaceType>("Floor");
  const presetsForSpace = VISUALIZER_PRESETS.filter((p) => p.spaceType === spaceType);
  const [presetId, setPresetId] = useState(presetsForSpace[0]?.id);
  const [productId, setProductId] = useState<string | undefined>(products[0]?.id);
  const [search, setSearch] = useState("");

  const preset =
    VISUALIZER_PRESETS.find((p) => p.id === presetId) ??
    presetsForSpace[0] ??
    VISUALIZER_PRESETS[0];
  const product = products.find((p) => p.id === productId);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(term) || p.productCode.toLowerCase().includes(term),
    );
  }, [products, search]);

  function handleSpaceTypeChange(next: SpaceType) {
    setSpaceType(next);
    const nextPresets = VISUALIZER_PRESETS.filter((p) => p.spaceType === next);
    setPresetId(nextPresets[0]?.id);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-gutter">
      <div className="space-y-8 order-2 lg:order-1">
        <div>
          <p className="mb-3 font-body text-label uppercase tracking-widest text-on-surface-variant">
            Space Type
          </p>
          <div className="flex flex-wrap gap-2">
            {SPACE_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleSpaceTypeChange(type)}
                className={cn(
                  "border px-3 py-2 font-body text-sm transition-colors",
                  type === spaceType
                    ? "border-secondary bg-secondary text-white"
                    : "border-outline-variant text-on-surface-variant hover:border-secondary",
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 font-body text-label uppercase tracking-widest text-on-surface-variant">
            Room
          </p>
          <div className="flex flex-wrap gap-2">
            {presetsForSpace.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPresetId(p.id)}
                className={cn(
                  "border px-3 py-2 font-body text-sm transition-colors",
                  p.id === preset.id
                    ? "border-secondary bg-secondary text-white"
                    : "border-outline-variant text-on-surface-variant hover:border-secondary",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 font-body text-label uppercase tracking-widest text-on-surface-variant">
            Tile
          </p>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tiles..."
            className="mb-3 w-full border border-outline-variant bg-surface px-3 py-2 font-body text-sm outline-none focus:border-secondary"
          />
          <div className="max-h-80 overflow-y-auto grid grid-cols-3 gap-2">
            {filteredProducts.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProductId(p.id)}
                title={p.name}
                className={cn(
                  "aspect-square overflow-hidden border-2 transition-colors",
                  p.id === productId ? "border-secondary" : "border-transparent",
                )}
              >
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-neutral-800" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="order-1 lg:order-2">
        <VisualizerCanvas preset={preset} tileImageUrl={product?.imageUrl} />
        {product && (
          <p className="mt-3 font-body text-sm text-on-surface-variant">
            Previewing <span className="text-on-surface">{product.name}</span> on {preset.label}
          </p>
        )}
      </div>
    </div>
  );
}
