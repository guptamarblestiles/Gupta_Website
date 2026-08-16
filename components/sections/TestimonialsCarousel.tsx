"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";

type Testimonial = {
  quote: string;
  attribution: string;
  imageUrl?: string;
};

const AUTO_ROTATE_MS = 5000;

function initialsFor(role: string): string {
  return role
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/**
 * Large single-slide editorial composition (quote over a room photo, dark
 * gradient scrim for legibility) rather than a grid of small cards. Quote
 * mark, quote text, and author each animate in on their own delay so the
 * reveal reads as staggered typography, not one block appearing at once.
 * Crossfades between testimonials (opacity only) instead of sliding.
 */
export function TestimonialsCarousel({ items }: { items: Testimonial[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const active = items[index];

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % items.length), AUTO_ROTATE_MS);
    return () => clearInterval(timer);
  }, [paused, items.length]);

  return (
    <RevealOnScroll>
      <section
        className="bg-hero-bg py-section-gap"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <Container>
          <div className="mb-12 md:mb-16 max-w-2xl mx-auto text-center">
            <p className="font-body text-label uppercase tracking-widest text-secondary mb-4">
              What Clients Say
            </p>
            <h2 className="font-display text-headline-mobile md:text-headline-tablet lg:text-headline text-hero-foreground">
              Testimonials
            </h2>
          </div>

          <div className="relative mx-auto max-w-4xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.6}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -80) setIndex((i) => (i + 1) % items.length);
                  else if (info.offset.x > 80) setIndex((i) => (i - 1 + items.length) % items.length);
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
                className="relative h-[440px] md:h-[420px] overflow-hidden rounded-lg cursor-grab active:cursor-grabbing"
              >
                {active.imageUrl ? (
                  <motion.img
                    src={active.imageUrl}
                    alt=""
                    aria-hidden="true"
                    initial={{ scale: 1.08 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 6, ease: "easeOut" }}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-zinc-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/20" />

                <div className="relative flex h-full flex-col justify-end p-8 md:p-14">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15, duration: 0.5 }}
                    aria-hidden="true"
                    className="mb-4 font-display text-6xl leading-none text-secondary"
                  >
                    &ldquo;
                  </motion.div>
                  <motion.p
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="font-display italic text-xl md:text-2xl text-white leading-relaxed max-w-2xl mb-8"
                  >
                    {active.quote}
                  </motion.p>
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="flex items-center gap-3"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-secondary-fixed to-secondary-strong font-body text-sm font-semibold text-white">
                      {initialsFor(active.attribution)}
                    </div>
                    <p className="font-body text-label uppercase tracking-widest text-white/80">
                      {active.attribution}
                    </p>
                  </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex items-center justify-center gap-6">
              <button
                type="button"
                aria-label="Previous testimonial"
                onClick={() => setIndex((i) => (i - 1 + items.length) % items.length)}
                className="text-hero-muted transition-colors hover:text-secondary rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex items-center gap-2">
                {items.map((t, i) => (
                  <button
                    key={t.attribution}
                    type="button"
                    aria-label={`Go to testimonial ${i + 1}`}
                    onClick={() => setIndex(i)}
                    className={`h-1.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 ${
                      i === index ? "w-6 bg-secondary" : "w-1.5 bg-hero-border"
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                aria-label="Next testimonial"
                onClick={() => setIndex((i) => (i + 1) % items.length)}
                className="text-hero-muted transition-colors hover:text-secondary rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </Container>
      </section>
    </RevealOnScroll>
  );
}
