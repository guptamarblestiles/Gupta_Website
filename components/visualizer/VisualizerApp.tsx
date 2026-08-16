/**
 * /visualizer's client-side flow:
 *   1. pick a space type (visual cards)
 *   2. pick a specific room preset within that space type
 *   3. pick a tile independently for each zone the preset has (floor
 *      and/or wall) — swapping one zone's tile never affects the other
 *   4. VisualizerCanvas renders the combined live preview
 *
 * Product list is fetched server-side (app/visualizer/page.tsx) and passed
 * in as a prop; filtering here is a plain client-side name/code search
 * over that list — fine at this catalogue size, not meant to replace the
 * full catalogue's server-side search (lib/products/queries.ts).
 */
"use client";

import { useMemo, useState } from "react";
import {
  VISUALIZER_PRESETS,
  SPACE_TYPES,
  type SpaceType,
  type ZoneKind,
} from "@/lib/visualizer/presets";
import { VisualizerCanvas } from "./VisualizerCanvas";
import type { Product } from "@/types/product";
import { cn } from "@/lib/utils/cn";

type VisualizerAppProps = {
  products: Product[];
};

const ZONE_LABEL: Record<ZoneKind, string> = { floor: "Floor Tile", wall: "Wall Tile" };

export function VisualizerApp({ products }: VisualizerAppProps) {
  const [spaceType, setSpaceType] = useState<SpaceType>("Drawing Room");
  const presetsForSpace = VISUALIZER_PRESETS.filter((p) => p.spaceType === spaceType);
  const [presetId, setPresetId] = useState(presetsForSpace[0]?.id);
  const [tileByZone, setTileByZone] = useState<Partial<Record<ZoneKind, string>>>({});
  const [search, setSearch] = useState("");

  const preset =
    VISUALIZER_PRESETS.find((p) => p.id === presetId) ??
    presetsForSpace[0] ??
    VISUALIZER_PRESETS[0];

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(term) || p.productCode.toLowerCase().includes(term),
    );
  }, [products, search]);

  const tileByZoneUrl: Partial<Record<ZoneKind, string | undefined>> = {
    floor: products.find((p) => p.id === tileByZone.floor)?.imageUrl,
    wall: products.find((p) => p.id === tileByZone.wall)?.imageUrl,
  };

  function handleSpaceTypeChange(next: SpaceType) {
    setSpaceType(next);
    const nextPresets = VISUALIZER_PRESETS.filter((p) => p.spaceType === next);
    setPresetId(nextPresets[0]?.id);
  }

  return (
    <div className="space-y-10">
      {/* Step 1 — space type */}
      <div>
        <p className="mb-3 font-body text-label uppercase tracking-widest text-on-surface-variant">
          1. Space Type
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {SPACE_TYPES.map((type) => {
            const thumb = VISUALIZER_PRESETS.find((p) => p.spaceType === type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => handleSpaceTypeChange(type)}
                className={cn(
                  "group overflow-hidden rounded border-2 text-left transition-colors",
                  type === spaceType ? "border-secondary" : "border-transparent hover:border-outline-variant",
                )}
              >
                {thumb && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb.imageSrc} alt="" className="aspect-video w-full object-cover" />
                )}
                <p className="px-2 py-1.5 font-body text-xs text-on-surface-variant group-hover:text-on-surface">
                  {type}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2 — room preset within that space type */}
      {presetsForSpace.length > 0 && (
        <div>
          <p className="mb-3 font-body text-label uppercase tracking-widest text-on-surface-variant">
            2. Room
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
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-gutter">
        {/* Step 3 — independent tile picker per zone */}
        <div className="space-y-8 order-2 lg:order-1">
          <div>
            <p className="mb-3 font-body text-label uppercase tracking-widest text-on-surface-variant">
              3. Tiles
            </p>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tiles..."
              className="mb-4 w-full border border-outline-variant bg-surface px-3 py-2 font-body text-sm outline-none focus:border-secondary"
            />

            {preset.zones.map((zone) => (
              <div key={zone.kind} className="mb-6">
                <p className="mb-2 font-body text-sm text-on-surface">{ZONE_LABEL[zone.kind]}</p>
                <div className="max-h-56 overflow-y-auto grid grid-cols-3 gap-2">
                  {filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        setTileByZone((prev) => ({ ...prev, [zone.kind]: p.id }))
                      }
                      title={p.name}
                      className={cn(
                        "aspect-square overflow-hidden border-2 transition-colors",
                        tileByZone[zone.kind] === p.id ? "border-secondary" : "border-transparent",
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
            ))}
          </div>
        </div>

        {/* Step 4 — combined live preview */}
        <div className="order-1 lg:order-2">
          <p className="mb-3 font-body text-label uppercase tracking-widest text-on-surface-variant">
            4. Preview
          </p>
          <VisualizerCanvas preset={preset} tileByZone={tileByZoneUrl} />
        </div>
      </div>
    </div>
  );
}
