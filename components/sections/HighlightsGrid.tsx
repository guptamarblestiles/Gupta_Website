"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Award, Gem, Handshake, Wrench, type LucideIcon } from "lucide-react";

type HighlightItem = {
  title: string;
  description: string;
  imageUrl?: string;
};

/** Icon components can't cross the Server -> Client boundary as props
 *  (RSC can't serialize a function), so they're resolved here by title
 *  instead of being passed down from Highlights. */
const ICONS: Record<string, LucideIcon> = {
  "Premium Materials": Gem,
  "Certified Quality": Award,
  "Custom Solutions": Wrench,
  "Expert Support": Handshake,
};

/**
 * Each card's photo scales down from a slight zoom (1.15 -> 1) and fades
 * in as it enters the viewport, staggered card-to-card (i * 120ms) —
 * "premium architectural photograph" reveal per the brief, GPU-only
 * transforms (scale/opacity/blur). Falls back to the plain icon card
 * (no image element at all) when a card has no imageUrl, so a missing
 * photo never renders a broken <img>.
 */
export function HighlightsGrid({ items }: { items: HighlightItem[] }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
      {items.map(({ title, description, imageUrl }, i) => {
        const Icon = ICONS[title] ?? Gem;
        return (
        <motion.div
          key={title}
          initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ delay: i * 0.12, duration: 0.6, ease: "easeOut" }}
          whileHover={{ y: -8 }}
          className="group flex flex-col overflow-hidden rounded-lg border-l-4 border-secondary bg-surface shadow-sm transition-shadow hover:shadow-xl"
        >
          {imageUrl && (
            <div className="relative h-40 overflow-hidden">
              <motion.img
                src={imageUrl}
                alt=""
                aria-hidden="true"
                initial={reduceMotion ? undefined : { scale: 1.15, opacity: 0 }}
                whileInView={reduceMotion ? undefined : { scale: 1, opacity: 1 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.12 + 0.1, duration: 0.9, ease: "easeOut" }}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>
          )}
          <div className="flex flex-1 flex-col items-start p-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-secondary/10 text-secondary">
              <Icon size={20} aria-hidden="true" />
            </div>
            <h3 className="font-display text-headline-sm-mobile md:text-headline-sm text-on-surface mb-2">
              {title}
            </h3>
            <p className="font-body text-body text-on-surface-variant leading-relaxed">{description}</p>
          </div>
        </motion.div>
        );
      })}
    </div>
  );
}
