/**
 * Quality/benefit grid. Each card staggers in on scroll (i * 100ms) and the
 * icon gets a small scale+rotate on hover — client component throughout
 * since every card needs its own whileInView/whileHover motion values
 * rather than one shared RevealOnScroll wrapper.
 */
"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Award, Gem, Handshake, Wrench } from "lucide-react";
import { Container } from "@/components/ui/Container";

const HIGHLIGHTS = [
  {
    icon: Gem,
    title: "Premium Materials",
    description: "Sourced from trusted quarries and suppliers, selected slab by slab.",
  },
  {
    icon: Award,
    title: "Certified Quality",
    description: "Durability-tested surfaces that hold up to daily commercial and residential use.",
  },
  {
    icon: Wrench,
    title: "Custom Solutions",
    description: "Finishes and sizing tailored to your project's exact requirements.",
  },
  {
    icon: Handshake,
    title: "Expert Support",
    description: "25+ years of industry experience guiding every selection.",
  },
];

export function Highlights() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="bg-background py-section-gap">
      <Container>
        <div className="mb-12 md:mb-16 max-w-2xl mx-auto text-center">
          <p className="font-body text-label uppercase tracking-widest text-secondary-strong mb-4">
            Why Gupta&apos;s
          </p>
          <h2 className="font-display text-headline-mobile md:text-headline-tablet lg:text-headline text-on-surface">
            Highlights
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
          {HIGHLIGHTS.map(({ icon: Icon, title, description }, i) => (
            <motion.div
              key={title}
              initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.12, duration: 0.6, ease: "easeOut" }}
              whileHover={{ scale: 1.02, y: -8 }}
              className="flex flex-col items-start text-left p-8 rounded-lg border-l-4 border-secondary bg-gradient-to-br from-surface-variant to-surface shadow-sm transition-shadow hover:shadow-xl"
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary/10 text-secondary"
              >
                <Icon size={28} aria-hidden="true" />
              </motion.div>
              <h3 className="font-display text-headline-sm-mobile md:text-headline-sm text-on-surface mb-2">
                {title}
              </h3>
              <p className="font-body text-body text-on-surface-variant leading-relaxed">
                {description}
              </p>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
