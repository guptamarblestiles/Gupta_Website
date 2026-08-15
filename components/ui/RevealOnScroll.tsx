"use client";

import { motion, useReducedMotion } from "framer-motion";

type RevealOnScrollProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

/**
 * Shared scroll-entrance wrapper used across every homepage section below
 * the hero, so the whole page reads as one cinematic sequence rather than a
 * hero with static sections bolted on (brief section 35 — animations must
 * feel intentional, not decorative).
 *
 * This is the ONLY client boundary each section needs: the section content
 * itself (copy, data, links) stays a Server Component and is passed in as
 * `children` — standard RSC composition, since a Server Component can still
 * render a Client Component and hand it server-rendered children.
 */
export function RevealOnScroll({ children, className, delay = 0 }: RevealOnScrollProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
