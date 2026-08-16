/**
 * Renders a preset room image with, for each of its zones (floor and/or
 * wall — see lib/visualizer/presets.ts), an independently selected tile
 * texture perspective-warped onto that zone's quad
 * (lib/visualizer/homography.ts). Swapping one zone's tile never touches
 * the other's layer — each is its own absolutely-positioned warped div.
 *
 * The warp math operates in the preset image's native pixel space (e.g.
 * 960x600), so this scales that fixed-size layer down to fit the actual
 * rendered width via a plain CSS transform: scale() — recomputed on resize
 * with a ResizeObserver — rather than trying to express the homography in
 * percentage units, which CSS matrix3d doesn't support.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { cornersToMatrix3d } from "@/lib/visualizer/homography";
import type { VisualizerPreset, ZoneKind } from "@/lib/visualizer/presets";

const TILE_PX = 160; // on-screen tile size (in preset-image pixels) before warp

type VisualizerCanvasProps = {
  preset: VisualizerPreset;
  /** Selected tile image URL per zone kind — a zone with no entry (or no
   *  matching zone in this preset) simply renders no overlay. */
  tileByZone: Partial<Record<ZoneKind, string | undefined>>;
};

export function VisualizerCanvas({ preset, tileByZone }: VisualizerCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / preset.imageWidth);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [preset.imageWidth]);

  return (
    <div
      ref={wrapperRef}
      className="relative w-full overflow-hidden rounded-lg bg-neutral-900"
      style={{ aspectRatio: `${preset.imageWidth} / ${preset.imageHeight}` }}
    >
      <div
        style={{
          width: preset.imageWidth,
          height: preset.imageHeight,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "relative",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preset.imageSrc}
          alt={preset.label}
          width={preset.imageWidth}
          height={preset.imageHeight}
          className="absolute inset-0"
        />
        {preset.zones.map((zone) => {
          const tileImageUrl = tileByZone[zone.kind];
          if (!tileImageUrl) return null;
          const matrix3d = cornersToMatrix3d(zone.corners, preset.imageWidth, preset.imageHeight);
          return (
            <div
              key={zone.kind}
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: preset.imageWidth,
                height: preset.imageHeight,
                transformOrigin: "0 0",
                transform: matrix3d,
                backgroundImage: `url(${tileImageUrl})`,
                backgroundSize: `${TILE_PX}px ${TILE_PX}px`,
                backgroundRepeat: "repeat",
                opacity: 0.92,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
