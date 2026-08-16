"use client";

import { useReducedMotion, motion } from "framer-motion";

/**
 * "Gate opening" quote reveal: a real marble slab photo (Roman White,
 * already in the live catalogue — not a placeholder) splits down the
 * middle and slides off-screen the first time this section scrolls into
 * view, revealing the quote on the dark hero background behind it. A
 * one-shot `whileInView` reveal, not a continuously scroll-scrubbed
 * animation (this replaces the previous version's pinned/scroll-linked
 * dark->light color morph — that mechanic is gone, not just restyled).
 *
 * Reduced-motion users get the quote directly on the dark background,
 * no marble/slide animation.
 */
const MARBLE_IMAGE_URL =
  "https://gvwaqvdhranchtzfgfiu.supabase.co/storage/v1/object/public/tiles/2x4-glossy-d-m-roman-white/image-0.webp";

const GATE_TRANSITION = { duration: 0.9, ease: [0.65, 0, 0.35, 1] as const };

export function ScrollTransition() {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <section className="flex h-64 w-full items-center justify-center bg-hero-bg px-margin">
        <p className="font-display text-headline-sm md:text-headline max-w-2xl text-center leading-snug text-hero-foreground">
          From quarry to craftsmanship — every slab carries the story of the earth it came from.
        </p>
      </section>
    );
  }

  return (
    <section className="relative h-screen w-full overflow-hidden bg-hero-bg">
      <motion.div
        aria-hidden="true"
        initial={{ x: "0%" }}
        whileInView={{ x: "-100%" }}
        viewport={{ once: true, margin: "-100px" }}
        transition={GATE_TRANSITION}
        className="absolute inset-y-0 left-0 w-1/2"
        style={{
          backgroundImage: `url(${MARBLE_IMAGE_URL})`,
          backgroundSize: "200% 100%",
          backgroundPosition: "left center",
        }}
      />
      <motion.div
        aria-hidden="true"
        initial={{ x: "0%" }}
        whileInView={{ x: "100%" }}
        viewport={{ once: true, margin: "-100px" }}
        transition={GATE_TRANSITION}
        className="absolute inset-y-0 right-0 w-1/2"
        style={{
          backgroundImage: `url(${MARBLE_IMAGE_URL})`,
          backgroundSize: "200% 100%",
          backgroundPosition: "right center",
        }}
      />

      <div className="relative flex h-full w-full items-center justify-center px-margin">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="max-w-3xl rounded-lg bg-gradient-to-r from-hero-bg/90 to-zinc-900/90 px-8 py-16 backdrop-blur-sm"
        >
          <p className="font-display text-headline-sm md:text-headline text-center italic leading-snug text-hero-foreground">
            From quarry to craftsmanship — every slab carries the story of the earth it came from.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
