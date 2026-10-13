"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

const EASE = [0.22, 1, 0.36, 1] as const;

type Offset = { x?: number; y?: number };

type Tile = {
  src: string;
  alt: string;
  /** Desktop entry offset in px — mobile uses a flat 32px in the same direction. */
  from: Offset;
  delay: number;
  objectPosition?: string;
  /** Percent position/size within the 2400x1500 collage reference frame. */
  desktop: { left: number; top: number; width: number; height: number };
  /** Mobile: plain grid-flow box with an explicit aspect ratio instead of
   *  absolute positioning — the desktop layout's proportions can't survive
   *  a 2-column width without squashing every photo. */
  mobileClassName: string;
};

// Reference frame 2400x1500, 12px gutters — positions given directly in
// the brief (x/y/w/h), converted to percentages of that frame so the
// layout scales with the container's own width. The math below is just
// x/2400, y/1500, w/2400, h/1500; the resulting 0.8%/0.5% gaps are exactly
// 12px at the 2400x1500 reference size.
const TILES: Tile[] = [
  {
    src: "/images/applications/home-bedroom-travertine-wall.webp",
    alt: "Travertine feature wall in a bedroom",
    from: { x: -80 },
    delay: 0,
    desktop: { left: 0, top: 0, width: (764 / 2400) * 100, height: (900 / 1500) * 100 },
    mobileClassName: "aspect-[4/5]",
  },
  {
    src: "/images/applications/home-kitchen-marble-island.webp",
    alt: "Marble kitchen island",
    from: { y: -80 },
    delay: 0.08,
    desktop: { left: (776 / 2400) * 100, top: 0, width: (876 / 2400) * 100, height: (720 / 1500) * 100 },
    mobileClassName: "aspect-[4/5]",
  },
  {
    src: "/images/applications/hospitality-cafe-stone-brick.webp",
    alt: "Stone and brick wall in a café",
    from: { x: -60, y: 60 },
    delay: 0.16,
    objectPosition: "center bottom",
    desktop: { left: 0, top: (912 / 1500) * 100, width: (764 / 2400) * 100, height: (588 / 1500) * 100 },
    // On mobile, placed third in the 2-col grid (not second) so it doesn't
    // immediately follow the bedroom tile and push "kitchen" onto its own
    // row below both of them — array order only matters for mobile's plain
    // document-order grid flow, not desktop's absolute positioning.
    mobileClassName: "col-span-2 aspect-[16/10]",
  },
  {
    src: "/images/applications/building-lobby-atrium.webp",
    alt: "Stone-clad atrium in a building lobby",
    from: { y: 80 },
    delay: 0.24,
    desktop: { left: (776 / 2400) * 100, top: (732 / 1500) * 100, width: (876 / 2400) * 100, height: (768 / 1500) * 100 },
    mobileClassName: "aspect-[4/5]",
  },
  {
    src: "/images/applications/home-shower-herringbone-tile.webp",
    alt: "Herringbone tile in a walk-in shower",
    from: { x: 80 },
    delay: 0.32,
    desktop: { left: (1664 / 2400) * 100, top: 0, width: (736 / 2400) * 100, height: 100 },
    mobileClassName: "aspect-[4/5]",
  },
];

/**
 * Collage reveal, closing the Applications section: the 5 curated photos
 * (not the applications-collage.webp composite, which stays unused by
 * this component — kept only as a static reference/preview) arrive from
 * five different directions and settle into a tight editorial grid.
 *
 * Desktop: one relative, aspect-[2400/1500] container; each tile is
 * absolutely positioned by percentage (derived from the 2400x1500
 * reference layout with 12px gutters — see TILES above), so the whole
 * collage scales with its width while every edge still lines up exactly.
 * Mobile: a plain 2-column grid with explicit per-tile aspect ratios
 * instead — the desktop proportions can't be preserved at that width
 * without squashing photos, so mobile is a deliberately simpler stack.
 */
export function ApplicationsCollage() {
  const reduceMotion = useReducedMotion();

  return (
    <div>
      <p className="mb-8 font-body text-label uppercase text-secondary-strong text-center">
        Our surfaces, in real spaces
      </p>

      {/* Desktop (md+): absolute percentage layout */}
      <div className="relative hidden w-full md:block" style={{ aspectRatio: "2400 / 1500" }}>
        {TILES.map((tile) => (
          <CollageTile
            key={tile.src}
            tile={tile}
            reduceMotion={reduceMotion}
            offsetScale={1}
            style={{
              left: `${tile.desktop.left}%`,
              top: `${tile.desktop.top}%`,
              width: `${tile.desktop.width}%`,
              height: `${tile.desktop.height}%`,
            }}
            className="absolute"
          />
        ))}
      </div>

      {/* Mobile (below md): simple 2-column staggered grid */}
      <div className="grid grid-cols-2 gap-3 md:hidden">
        {TILES.map((tile) => (
          <CollageTile
            key={tile.src}
            tile={tile}
            reduceMotion={reduceMotion}
            offsetScale={32}
            className={cn("relative w-full", tile.mobileClassName)}
          />
        ))}
      </div>
    </div>
  );
}

function CollageTile({
  tile,
  reduceMotion,
  offsetScale,
  className,
  style,
}: {
  tile: Tile;
  reduceMotion: boolean | null;
  /** 1 = use tile.from as-is (desktop); 32 = flatten to a 32px offset in the same direction (mobile). */
  offsetScale: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const from: Offset =
    offsetScale === 1
      ? tile.from
      : {
          x: tile.from.x ? Math.sign(tile.from.x) * offsetScale : undefined,
          y: tile.from.y ? Math.sign(tile.from.y) * offsetScale : undefined,
        };

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, ...from }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.8, delay: tile.delay, ease: EASE }}
      style={style}
      className={cn("overflow-hidden rounded-[8px] bg-surface-variant", className)}
    >
      <Image
        src={tile.src}
        alt={tile.alt}
        fill
        sizes="(min-width: 768px) 35vw, 50vw"
        className="object-cover"
        style={{ objectPosition: tile.objectPosition }}
      />
    </motion.div>
  );
}
