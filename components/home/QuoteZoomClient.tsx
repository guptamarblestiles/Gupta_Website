"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

type QuoteZoomClientProps = {
  imageUrl: string;
  imageAlt: string;
};

/**
 * The actual scroll-driven zoom: a tall (220vh) wrapper with a pinned
 * (sticky) viewport-height panel inside it. useScroll's scrollYProgress
 * over that wrapper drives image scale (1.05 -> 1.55) and a white overlay's
 * opacity (0 -> 1 near the end), so the material fills the frame and then
 * dissolves into the next section's white background rather than cutting
 * hard from dark to light. Only `scale`/`opacity` are animated — both
 * GPU-compositable, no layout thrashing.
 *
 * Reduced-motion users get the image and quote statically, no pin/zoom.
 */
export function QuoteZoomClient({ imageUrl, imageAlt }: QuoteZoomClientProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ["start start", "end end"],
  });

  const imageScale = useTransform(scrollYProgress, [0, 0.85], [1.05, 1.55]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.15, 0.55, 0.75], [0, 1, 1, 0]);
  const textY = useTransform(scrollYProgress, [0, 0.15], [16, 0]);
  const whiteOverlayOpacity = useTransform(scrollYProgress, [0.7, 1], [0, 1]);

  if (reduceMotion) {
    return (
      <section className="relative flex h-[70vh] w-full items-center justify-center overflow-hidden bg-hero-bg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={imageAlt} className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-hero-bg/70" />
        <p className="font-display text-headline-sm md:text-headline relative max-w-2xl px-margin text-center italic leading-snug text-hero-foreground">
          From quarry to craftsmanship. Every surface carries a story.
        </p>
      </section>
    );
  }

  return (
    <div ref={wrapperRef} className="relative h-[220vh] bg-hero-bg">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <motion.div style={{ scale: imageScale }} className="absolute inset-0 h-full w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={imageAlt} className="h-full w-full object-cover" />
        </motion.div>

        {/* Constant dark scrim so the overlay text stays legible against
            the marble at every zoom level. */}
        <div aria-hidden="true" className="absolute inset-0 bg-hero-bg/45" />

        <motion.div
          style={{ opacity: textOpacity, y: textY }}
          className="relative flex h-full w-full flex-col items-center justify-center px-margin text-center"
        >
          <p className="font-display text-headline-sm md:text-headline italic leading-snug text-hero-foreground">
            From quarry to craftsmanship.
          </p>
          <p className="font-body text-body-lg mt-3 text-hero-muted">Every surface carries a story.</p>
        </motion.div>

        {/* Dissolves the zoomed marble into the white section that
            follows, avoiding a hard dark->light cut. */}
        <motion.div
          aria-hidden="true"
          style={{ opacity: whiteOverlayOpacity }}
          className="absolute inset-0 bg-background"
        />
      </div>
    </div>
  );
}
