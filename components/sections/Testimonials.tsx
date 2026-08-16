/**
 * Auto-rotating testimonial carousel (5s interval, pauses on hover): 2
 * cards side-by-side with a staggered vertical offset on desktop, 1
 * full-width on mobile. Fades between slides (not a slide/translate) per
 * the visual redesign brief.
 *
 * PLACEHOLDER CONTENT: these are generic, unattributed-to-any-real-person
 * quotes — no invented customer names or companies. Avatars show initials
 * derived from the role label (e.g. "Residential Client" -> "RC"), not a
 * fabricated person's initials. Presenting fabricated testimonials as real
 * reviews from named people would be misleading to site visitors; replace
 * every entry here with a real review (and real attribution) before this
 * section goes live.
 */
"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

function initialsFor(role: string): string {
  return role
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function useVisibleCount() {
  const [count, setCount] = useState(1);
  useEffect(() => {
    const mdQuery = window.matchMedia("(min-width: 768px)");
    function update() {
      setCount(mdQuery.matches ? 2 : 1);
    }
    update();
    mdQuery.addEventListener("change", update);
    return () => mdQuery.removeEventListener("change", update);
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="flex flex-col md:flex-row gap-gutter items-stretch"
              >
                {visible.map((t, i) => (
                  <motion.div
                    key={t.attribution}
                    style={{ marginTop: i % 2 === 1 ? "1.5rem" : 0 }}
                    whileHover={{ y: -4 }}
                    className="flex-1 flex flex-col p-8 bg-surface border border-outline-variant/50 rounded-lg shadow-sm transition-shadow hover:shadow-lg hover:border-secondary/40"
                  >
                    <div
                      aria-hidden="true"
                      className="mb-4 font-display text-5xl leading-none text-secondary"
                    >
                      &ldquo;
                    </div>
                    <p className="font-display italic text-lg text-on-surface leading-relaxed mb-6 flex-1">
                      {t.quote}
                    </p>
                    <div className="flex items-center gap-3 pt-4 border-t border-outline-variant/50">
                      <div
                        aria-hidden="true"
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-secondary-fixed to-secondary-strong font-body text-sm font-semibold text-white"
                      >
                        {initialsFor(t.attribution)}
                      </div>
                      <p className="font-body text-label uppercase tracking-widest text-on-surface-variant">
                        {t.attribution}
                      </p>
                    </div>
                  </motion.div>
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
                  <motion.button
                    key={i}
                    type="button"
                    aria-label={`Go to testimonial ${i + 1}`}
                    onClick={() => setIndex(i)}
                    whileHover={{ scale: 1.2 }}
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
