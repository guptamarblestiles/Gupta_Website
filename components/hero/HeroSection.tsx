"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { HeroVideoBackground } from "./HeroVideoBackground";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

/**
 * Split editorial hero: a solid charcoal text panel beside a real video/
 * image panel, rather than text floating over a dark wash on top of a
 * photo. This is a deliberate fix for the "opaque grey overlay with
 * floating text" problem — copy never needs to fight the image for
 * contrast because it never sits on top of it.
 *
 * The media panel currently plays the real marble/stone/interior video
 * clips already in the project (components/hero/HeroVideoBackground).
 * Swap in real finished-space photography here once available — no other
 * changes needed, this panel is a plain full-bleed media slot.
 */
export function HeroSection() {
  return (
    <section className="relative bg-hero-bg pt-16 md:pt-20 lg:pt-0 lg:grid lg:grid-cols-12 lg:min-h-[85vh]">
      <div className="relative z-10 flex flex-col justify-center pt-10 pb-16 md:pt-12 md:pb-20 lg:py-28 lg:col-span-5 px-margin lg:px-0">
        <Container as="div" className="lg:ml-auto lg:mr-0 lg:max-w-xl lg:px-12 xl:px-16">
          <motion.p
            initial="hidden"
            animate="show"
            custom={0}
            variants={fadeUp}
            className="font-body text-label text-secondary-fixed mb-5 uppercase"
          >
            Tiles &middot; Marble &middot; Natural Stone
          </motion.p>

          <motion.h1
            initial="hidden"
            animate="show"
            custom={0.1}
            variants={fadeUp}
            className="font-display text-display-mobile md:text-display-tablet lg:text-display text-hero-foreground mb-6"
          >
            Beautiful spaces begin with the right materials.
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="show"
            custom={0.2}
            variants={fadeUp}
            className="font-body text-body-lg text-hero-muted max-w-md mb-10 leading-relaxed"
          >
            Discover a thoughtfully curated range of tiles, marble, and natural stone at our
            Delhi showroom — the right surface for every room, chosen with you, not just sold
            to you.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="show"
            custom={0.3}
            variants={fadeUp}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Button href="/collections" variant="hero-primary" size="lg">
              Explore Our Collections
            </Button>
            <Button href="/contact" variant="hero-secondary" size="lg">
              Enquire Now
            </Button>
          </motion.div>
        </Container>
      </div>

      <div className="relative h-[55vh] lg:h-auto lg:min-h-[85vh] lg:col-span-7 overflow-hidden">
        <HeroVideoBackground />
        {/* Light bottom gradient only, for the showroom caption below —
            never an opaque wash over the whole image. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-hero-bg/60 to-transparent"
        />
        <p className="absolute bottom-6 right-6 font-body text-micro text-hero-foreground/80 uppercase">
          Showroom &middot; Mangolpur Kalan, Delhi
        </p>
      </div>
    </section>
  );
}
