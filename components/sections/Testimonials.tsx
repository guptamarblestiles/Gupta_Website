/**
 * Auto-rotating testimonial carousel (5s interval, pauses on hover), 1
 * card visible on mobile, 2 on tablet, 3 on desktop.
 *
 * PLACEHOLDER CONTENT: these are generic, unattributed-to-any-real-person
 * quotes — no invented customer names or companies. Presenting fabricated
 * testimonials as real reviews from named people would be misleading to
 * site visitors; replace every entry here with a real review (and real
 * attribution) before this section goes live.
 */
"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";

const TESTIMONIALS = [
  {
    quote:
      "The marble selection elevated the entire space. Every slab was matched and installed exactly as promised.",
    attribution: "Residential Client",
  },
  {
    quote:
      "Reliable sourcing and consistent quality across a large commercial order — exactly what a tight project timeline needs.",
    attribution: "Commercial Project Lead",
  },
  {
    quote:
      "Our lobby renovation needed a finish that photographed as well as it wore. This delivered on both.",
    attribution: "Hospitality Designer",
  },
  {
    quote: "Straightforward to work with, from sample selection through final installation.",
    attribution: "Interior Designer",
  },
];

const AUTO_ROTATE_MS = 5000;

function useVisibleCount() {
  const [count, setCount] = useState(1);
  useEffect(() => {
    const mdQuery = window.matchMedia("(min-width: 768px)");
    const lgQuery = window.matchMedia("(min-width: 1024px)");
    function update() {
      setCount(lgQuery.matches ? 3 : mdQuery.matches ? 2 : 1);
    }
    update();
    mdQuery.addEventListener("change", update);
    lgQuery.addEventListener("change", update);
    return () => {
      mdQuery.removeEventListener("change", update);
      lgQuery.removeEventListener("change", update);
    };
  }, []);
  return count;
}

export function Testimonials() {
  const visibleCount = useVisibleCount();
  const pageCount = Math.max(1, TESTIMONIALS.length - visibleCount + 1);
  const [rawIndex, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // Clamped at render time (not in an effect) so a shrinking pageCount
  // (e.g. resizing to a wider breakpoint) never leaves the index pointing
  // past the end without an extra render round-trip.
  const index = Math.min(rawIndex, pageCount - 1);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => setIndex((i) => (Math.min(i, pageCount - 1) + 1) % pageCount), AUTO_ROTATE_MS);
    return () => clearInterval(timer);
  }, [paused, pageCount]);

  const visible = TESTIMONIALS.slice(index, index + visibleCount);

  return (
    <RevealOnScroll>
      <section
        className="bg-surface-variant py-section-gap"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <Container>
          <div className="mb-12 md:mb-16 max-w-2xl mx-auto text-center">
            <p className="font-body text-label uppercase tracking-widest text-secondary-strong mb-4">
              What Clients Say
            </p>
            <h2 className="font-display text-headline-mobile md:text-headline-tablet lg:text-headline text-on-surface">
              Testimonials
            </h2>
          </div>

          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter"
              >
                {visible.map((t) => (
                  <div key={t.attribution} className="bg-surface p-card flex flex-col">
                    <Quote size={22} className="text-secondary mb-4" aria-hidden="true" />
                    <p className="font-body text-body text-on-surface leading-relaxed mb-6 flex-1">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                    <p className="font-body text-label uppercase tracking-widest text-on-surface-variant">
                      {t.attribution}
                    </p>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>

            <div className="mt-10 flex items-center justify-center gap-6">
              <button
                type="button"
                aria-label="Previous testimonial"
                onClick={() => setIndex((i) => (i - 1 + pageCount) % pageCount)}
                className="text-on-surface-variant transition-colors hover:text-secondary"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex items-center gap-2">
                {Array.from({ length: pageCount }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Go to testimonial ${i + 1}`}
                    onClick={() => setIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === index ? "w-6 bg-secondary" : "w-1.5 bg-outline-variant"
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                aria-label="Next testimonial"
                onClick={() => setIndex((i) => (i + 1) % pageCount)}
                className="text-on-surface-variant transition-colors hover:text-secondary"
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
