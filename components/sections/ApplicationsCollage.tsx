"use client";

import { useSyncExternalStore } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

const EASE = [0.22, 1, 0.36, 1] as const;
const MOBILE_QUERY = "(max-width: 767px)";

function subscribeToMobileQuery(callback: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getMobileSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

type Tile = {
  src: string;
  alt: string;
  /** Desktop entry offset in px; halved-ish for mobile (32px cap) inside the component. */
  from: { x?: number; y?: number };
  delay: number;
  className: string;
};

const TILES: Tile[] = [
  {
    src: "/images/applications/home-bedroom-travertine-wall.webp",
    alt: "Travertine feature wall in a bedroom",
    from: { x: -80 },
    delay: 0,
    className: "md:row-start-1",
  },
  {
    src: "/images/applications/hospitality-cafe-stone-brick.webp",
    alt: "Stone and brick wall in a café",
    from: { x: -60, y: 60 },
    delay: 0.08,
    className: "col-span-2 md:col-span-1 md:row-start-2",
  },
  {
    src: "/images/applications/home-kitchen-marble-island.webp",
    alt: "Marble kitchen island",
    from: { y: -80 },
    delay: 0.16,
    className: "md:row-start-1",
  },
  {
    src: "/images/applications/building-lobby-atrium.webp",
    alt: "Stone-clad atrium in a building lobby",
    from: { y: 80 },
    delay: 0.24,
    className: "md:row-start-2",
  },
  {
    src: "/images/applications/home-shower-herringbone-tile.webp",
    alt: "Herringbone tile in a walk-in shower",
    from: { x: 80 },
    delay: 0.32,
    className: "col-span-2 md:col-span-1 md:row-span-2",
  },
];

/**
 * Collage reveal, closing the Applications section: the 5 curated photos
 * (not the applications-collage.webp composite, which stays unused by
 * this component — kept only as a static reference/preview) arrive from
 * five different directions and settle into a grid. Desktop reproduces
 * the asymmetric 3-column/2-row collage proportions (764/876/764 wide,
 * 900+576 / 720+768 tall) via two nested sub-grids (left/middle columns)
 * plus one full-height tile (right); mobile collapses to a simple
 * 2-column staggered grid — `contents` on the column wrappers lets each
 * tile become a direct child of the outer 2-col grid at that breakpoint
 * instead of trying to preserve the desktop asymmetry at a width it can't
 * fit cleanly.
 */
export function ApplicationsCollage() {
  const reduceMotion = useReducedMotion();
  const isMobile = useSyncExternalStore(subscribeToMobileQuery, getMobileSnapshot, getServerSnapshot);

  return (
    <div>
      <p className="mb-8 font-body text-label uppercase text-secondary-strong text-center">
        Our surfaces, in real spaces
      </p>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-[764fr_876fr_764fr] md:grid-rows-2">
        {/* Left column: bedroom (900fr) over café (576fr) */}
        <div className="contents md:grid md:grid-rows-[900fr_576fr] md:gap-3 md:col-start-1 md:row-span-2">
          <CollageTile tile={TILES[0]} reduceMotion={reduceMotion} isMobile={isMobile} />
          <CollageTile tile={TILES[1]} reduceMotion={reduceMotion} isMobile={isMobile} />
        </div>

        {/* Middle column: kitchen (720fr) over lobby (768fr) */}
        <div className="contents md:grid md:grid-rows-[720fr_768fr] md:gap-3 md:col-start-2 md:row-span-2">
          <CollageTile tile={TILES[2]} reduceMotion={reduceMotion} isMobile={isMobile} />
          <CollageTile tile={TILES[3]} reduceMotion={reduceMotion} isMobile={isMobile} />
        </div>

        {/* Right column: shower, full height */}
        <CollageTile
          tile={TILES[4]}
          reduceMotion={reduceMotion}
          isMobile={isMobile}
          className="md:col-start-3 md:row-span-2"
        />
      </div>
    </div>
  );
}

function CollageTile({
  tile,
  reduceMotion,
  isMobile,
  className,
}: {
  tile: Tile;
  reduceMotion: boolean | null;
  isMobile: boolean;
  className?: string;
}) {
  // Mobile offsets capped at 32px per the brief; desktop uses the full
  // directional offset defined per tile above.
  const mobileFrom = {
    x: tile.from.x ? Math.sign(tile.from.x) * 32 : undefined,
    y: tile.from.y ? Math.sign(tile.from.y) * 32 : undefined,
  };
  const from = isMobile ? mobileFrom : tile.from;

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, ...from }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.8, delay: tile.delay, ease: EASE }}
      className={cn("relative aspect-square overflow-hidden rounded-[8px] bg-surface-variant", tile.className, className)}
    >
      <Image src={tile.src} alt={tile.alt} fill sizes="(min-width: 768px) 30vw, 50vw" className="object-cover" />
    </motion.div>
  );
}
