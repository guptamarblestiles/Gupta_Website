"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, ChevronLeft, ChevronRight, Home, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { Tile3D } from "./Tile3D";

type ApplicationItem = {
  title: string;
  description: string;
  imageUrl: string;
};

type ApplicationsCarouselProps = {
  items: ApplicationItem[];
};

/** Icon components can't cross the Server -> Client boundary as props
 *  (RSC can't serialize a function), so they're resolved here by title
 *  instead of being passed down from ApplicationsTiles. */
const ICONS: Record<string, LucideIcon> = {
  Residential: Home,
  Commercial: Building2,
  Hospitality: UtensilsCrossed,
};

/**
 * Product-showcase-style carousel: one large dominant slide with its
 * neighbors peeking in scaled/blurred at the edges, swipeable (drag) on
 * touch, arrow + dot controls otherwise. Only transform/opacity/filter
 * are animated (GPU-friendly, per the brief).
 */
export function ApplicationsCarousel({ items }: ApplicationsCarouselProps) {
  const [index, setIndex] = useState(0);
  const active = items[index];
  const Icon = ICONS[active.title] ?? Home;

  function go(next: number) {
    setIndex(((next % items.length) + items.length) % items.length);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-gutter items-center">
      <div>
        <div className="relative h-[420px] md:h-[520px] overflow-hidden rounded-lg">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              key={active.title}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.6}
              onDragEnd={(_, info) => {
                if (info.offset.x < -80) go(index + 1);
                else if (info.offset.x > 80) go(index - 1);
              }}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 cursor-grab active:cursor-grabbing"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={active.imageUrl} alt={active.title} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 p-8 md:p-10">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm">
                  <Icon size={20} aria-hidden="true" />
                </div>
                <h3 className="font-display text-headline-sm-mobile md:text-headline-sm text-white mb-2">
                  {active.title}
                </h3>
                <p className="font-body text-body text-white/80 max-w-md leading-relaxed">
                  {active.description}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-6 flex items-center justify-center gap-6">
          <button
            type="button"
            aria-label="Previous application"
            onClick={() => go(index - 1)}
            className="text-on-surface-variant transition-colors hover:text-secondary"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            {items.map((item, i) => (
              <button
                key={item.title}
                type="button"
                aria-label={`Go to ${item.title}`}
                onClick={() => go(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-6 bg-secondary" : "w-1.5 bg-outline-variant"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="Next application"
            onClick={() => go(index + 1)}
            className="text-on-surface-variant transition-colors hover:text-secondary"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <Tile3D imageUrl={active.imageUrl} />
    </div>
  );
}
