"use client";

import { motion, useReducedMotion } from "framer-motion";

export function ScrollIndicator() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-20">
      <span className="font-body text-label uppercase tracking-widest text-hero-muted opacity-80">
        Scroll to explore
      </span>
      <div className="relative w-px h-16 bg-gradient-to-b from-hero-border to-transparent">
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-hero-foreground"
          animate={reduceMotion ? { top: "0%" } : { top: ["0%", "70%", "0%"] }}
          transition={reduceMotion ? undefined : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}
