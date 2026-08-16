"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { StoneSwatch } from "@/components/ui/StoneSwatch";

/**
 * Mobile/no-JS-3D fallback for the hero visual — no three.js/R3F is ever
 * imported on this path (see Hero3DTileLoader), just a CSS marble texture
 * with a light scroll parallax. Swap the StoneSwatch for a real
 * next/image hero photograph once production photography exists; the
 * rounded-slab framing is sized to match the desktop 3D tile's silhouette
 * so the layout doesn't jump between breakpoints.
 */
export function StaticHeroTile() {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : 60]);

  return (
    <div ref={ref} className="relative flex h-full w-full items-center justify-center overflow-hidden">
      <motion.div
        style={reduceMotion ? undefined : { y }}
        className="relative aspect-[4/5] w-56 shadow-2xl shadow-black/50 sm:w-64"
      >
        <StoneSwatch stone="statuario" className="absolute inset-0 h-full w-full rounded-sm" />
        <div className="absolute inset-0 rounded-sm ring-1 ring-inset ring-white/10" />
      </motion.div>
    </div>
  );
}
