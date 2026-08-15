"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

/**
 * Brief section 12 — the "Magic Scroll Transition" signature feature.
 * A pinned (sticky) panel whose background and supporting line interpolate
 * from the dark hero palette to the light catalogue palette as the user
 * scrolls through it, so the dark→light handoff reads as one continuous
 * cinematic move rather than a hard cut between two sections.
 *
 * Reduced-motion users get a short static gradient instead of a pinned,
 * scroll-linked animation (brief section 32).
 */
export function ScrollTransition() {
  const targetRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start end", "end start"],
  });

  const background = useTransform(
    scrollYProgress,
    [0, 0.55, 1],
    ["#09090b", "#09090b", "#ffffff"],
  );
  const textColor = useTransform(
    scrollYProgress,
    [0, 0.55, 1],
    ["#f5f5f4", "#f5f5f4", "#1a1a1a"],
  );
  const textOpacity = useTransform(scrollYProgress, [0.12, 0.32, 0.72, 0.92], [0, 1, 1, 0]);
  const textY = useTransform(scrollYProgress, [0.12, 0.32], [24, 0]);

  if (reduceMotion) {
    return (
      <section
        aria-hidden="true"
        className="h-40 w-full bg-gradient-to-b from-hero-bg to-background"
      />
    );
  }

  return (
    <div ref={targetRef} className="relative h-[160vh]">
      <motion.section
        style={{ backgroundColor: background }}
        className="sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden"
      >
        <motion.p
          style={{ color: textColor, opacity: textOpacity, y: textY }}
          className="font-display text-headline-sm md:text-headline max-w-2xl px-margin text-center leading-snug"
        >
          From quarry to craftsmanship — every slab carries the story of the earth it came from.
        </motion.p>
      </motion.section>
    </div>
  );
}
