"use client";

import dynamic from "next/dynamic";
import { useReducedMotion } from "framer-motion";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { StaticHeroTile } from "./StaticHeroTile";

// The 3D scene (three.js + R3F + drei) is dynamically imported with
// ssr:false so it never blocks or bloats the initial server-rendered
// payload — per brief section 9: "must be dynamically imported so that the
// initial page load does not unnecessarily block rendering." Mobile never
// triggers this import at all (see below), so the three.js bundle is never
// fetched on phones.
const Hero3DTile = dynamic(() => import("./Hero3DTile"), {
  ssr: false,
  loading: () => <TileFallback />,
});

function TileFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center" aria-hidden="true">
      <div className="w-40 h-52 md:w-56 md:h-72 rounded-sm bg-gradient-to-br from-hero-surface to-hero-bg border border-hero-border animate-pulse" />
    </div>
  );
}

/**
 * Viewport-conditional hero visual:
 *  - Desktop (>=1024px): full 3D rotating slab.
 *  - Tablet (768-1023px): 3D slab with a cheaper lighting/shadow rig.
 *  - Mobile (<768px): static CSS marble tile with scroll parallax, no
 *    three.js/R3F ever loaded — this is the meaningful payload savings on
 *    the connection tier that needs it most.
 * `matches === null` (before the first client-side effect runs) falls back
 * to the same pulse skeleton the dynamic import's loading state uses, so
 * there's no layout flash once the real breakpoint is known.
 */
export function Hero3DTileLoader() {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isTabletUp = useMediaQuery("(min-width: 768px)");
  const reduceMotion = useReducedMotion();

  if (isDesktop === null || isTabletUp === null) {
    return (
      <div className="w-full h-full">
        <TileFallback />
      </div>
    );
  }

  if (!isTabletUp) {
    return (
      <div className="w-full h-full">
        <StaticHeroTile />
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <Hero3DTile lowPoly={!isDesktop} reduceMotion={Boolean(reduceMotion)} />
    </div>
  );
}
