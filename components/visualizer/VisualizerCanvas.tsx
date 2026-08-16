/**
 * Renders a preset room image with a product's tile texture perspective-
 * warped onto the preset's configured quad (lib/visualizer/homography.ts).
 * The warp math operates in the preset image's native pixel space (e.g.
 * 960x600), so this scales that fixed-size layer down to fit the actual
 * rendered width via a plain CSS transform: scale() — recomputed on resize
 * with a ResizeObserver — rather than trying to express the homography in
 * percentage units, which CSS matrix3d doesn't support.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { cornersToMatrix3d } from "@/lib/visualizer/homography";
import type { VisualizerPreset } from "@/lib/visualizer/presets";

const TILE_PX = 160; // on-screen tile size (in preset-image pixels) before warp

type VisualizerCanvasProps = {
  preset: VisualizerPreset;
  tileImageUrl?: string;
};

export function VisualizerCanvas({ preset, tileImageUrl }: VisualizerCanvasProps) {
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

  const matrix3d = cornersToMatrix3d(preset.corners, preset.imageWidth, preset.imageHeight);

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
        {tileImageUrl && (
          <div
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
        )}
      </div>
    </div>
  );
}
