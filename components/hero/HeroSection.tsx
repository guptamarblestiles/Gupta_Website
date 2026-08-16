"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Hero3DTileLoader } from "./Hero3DTileLoader";
import { ScrollIndicator } from "./ScrollIndicator";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function HeroSection() {
  return (
    <section className="relative min-h-screen bg-hero-bg overflow-hidden flex items-center pt-32 pb-20 lg:pt-40 lg:pb-28">
      {/* Cinematic spotlight glow behind the tile — kept subtle per brief section 10 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[900px] max-h-[900px] rounded-full opacity-40 blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, rgba(230,161,102,0.35) 0%, rgba(184,115,51,0.12) 45%, transparent 70%)",
        }}
      />

      <Container className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-gutter items-center">
        <div className="md:col-span-6 flex flex-col">
          <motion.h1
            initial="hidden"
            animate="show"
            custom={0}
            variants={fadeUp}
            className="font-display text-display-mobile md:text-display-tablet lg:text-display text-hero-foreground mb-8"
          >
            Redefining <span className="italic text-secondary">Elegance</span>
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="show"
            custom={0.15}
            variants={fadeUp}
            className="font-body text-body-lg text-hero-muted max-w-lg mb-12 leading-relaxed"
          >
            Architectural surfaces designed to transform spaces. We source and curate the
            world&apos;s most exceptional marble and stone for visionary projects.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="show"
            custom={0.3}
            variants={fadeUp}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Button href="/products" variant="hero-primary" size="lg">
              Explore the Catalogue
            </Button>
            <Button href="/#contact" variant="hero-secondary" size="lg">
              Get in Touch
            </Button>
          </motion.div>
        </div>

        <div className="md:col-span-6 h-[420px] md:h-[560px] w-full">
          <Hero3DTileLoader />
        </div>
      </Container>

      <ScrollIndicator />

      {/* Soft fade into the light section that follows, smoothing the
          dark-to-light handoff (fuller scroll-driven transition lands in
          the next build step once that section has real content). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-hero-bg"
      />
    </section>
  );
}
