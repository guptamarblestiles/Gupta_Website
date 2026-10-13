/**
 * Site navbar — a flat, full-width bar with a single bottom border, per
 * the luxury/editorial system's "architectural precision" rule (no
 * rounded corners, no floating glass pill). Sits flush to the viewport
 * top at all times; only its background/border/text color change.
 *
 * Two explicit states on the "auto" variant, not a continuous scroll-scrub:
 *   Initial (scrollY <= SCROLL_THRESHOLD) — transparent, no border, text
 *     reads in the hero's alabaster foreground.
 *   Scrolled (scrollY > SCROLL_THRESHOLD) — gains a solid alabaster
 *     background and a hairline bottom border so it stays legible once
 *     it's no longer floating over the dark hero image.
 *
 * Separately, `overLight` tracks a much larger threshold (roughly one
 * viewport height, i.e. past the dark hero) and switches the brand/nav
 * text from light to dark — necessary because light text over the page's
 * alabaster content sections below the hero would be invisible otherwise.
 * Deliberately a second, independent threshold from SCROLL_THRESHOLD: the
 * background solidifies almost immediately on scroll, while the text color
 * must wait until the dark hero has actually scrolled past.
 *
 * Hide-on-scroll-down / show-on-scroll-up (both variants): the bar is
 * always visible until the hero is scrolled past (HERO_RATIO of the
 * viewport height — approximates the hero's `min-h-screen` without a
 * layout-coupled ref). Past that point, any downward scroll hides it;
 * scrolling up by UP_REVEAL_PX or more brings it back. Tracked via a ref
 * (not state) for the upward-travel accumulator so the 60fps scroll
 * handler doesn't re-render every tick — only the two booleans that
 * actually change class/transform (`hidden`, the existing `scrolled` /
 * `overLight`) trigger renders.
 *
 * "light" variant (every other page) is the same flat bar, always solid,
 * no scroll animation, and never hides.
 *
 * DEVIATION: the redesign spec's nav list includes "Catalogue" (a PDF
 * showcase page) — that page was explicitly deferred (no PDF files exist
 * yet), so it's left out of this nav rather than linking to a route that
 * doesn't exist. Add it back once app/catalogue/page.tsx exists.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { BrandWordmark } from "@/components/ui/BrandWordmark";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Tiles", href: "/tiles" },
  { label: "Collections", href: "/collections" },
  { label: "About", href: "/#about" },
  { label: "Contact", href: "/#contact" },
];

const SCROLL_THRESHOLD = 60; // px scrolled before the bar gains its solid background
const HERO_RATIO = 0.9; // fraction of viewport height treated as "still in the hero"
const UP_REVEAL_PX = 8; // cumulative upward travel before the bar re-shows
const COLOR_TRANSITION = { duration: 0.5, ease: "easeInOut" as const };
const SLIDE_TRANSITION = { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const };

type NavbarProps = {
  /**
   * "auto"  — transparent over a dark hero; gains a solid alabaster
   *           background + hairline border on scroll (homepage only).
   * "light" — same flat bar, always solid, no scroll animation.
   */
  variant?: "auto" | "light";
};

export function Navbar({ variant = "light" }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [overLight, setOverLight] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const reduceMotion = useReducedMotion();

  const lastYRef = useRef(0);
  const upTravelRef = useRef(0);

  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (latest) => {
    if (variant !== "auto") return;
    setScrolled(latest > SCROLL_THRESHOLD);
    setOverLight(latest > window.innerHeight * 0.8);

    const heroBoundary = window.innerHeight * HERO_RATIO;
    const lastY = lastYRef.current;
    const delta = latest - lastY;
    lastYRef.current = latest;

    if (latest <= heroBoundary) {
      upTravelRef.current = 0;
      setNavHidden(false);
      return;
    }

    if (delta > 0) {
      // Scrolling down past the hero — hide, and reset the upward-travel
      // accumulator so a brief up-flick mid-downward-scroll doesn't count.
      upTravelRef.current = 0;
      setNavHidden(true);
    } else if (delta < 0) {
      upTravelRef.current += -delta;
      if (upTravelRef.current >= UP_REVEAL_PX) {
        setNavHidden(false);
      }
    }
  });

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const isAuto = variant === "auto";
  const solid = !isAuto || scrolled;
  const darkText = !isAuto || overLight;
  // Never hide while the mobile menu is open, or for the "light" variant's
  // sub-pages — only the homepage hero/scroll choreography hides the bar.
  const hidden = isAuto && navHidden && !mobileOpen;

  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <motion.div
        animate={{
          backgroundColor: solid ? "var(--color-background)" : "rgba(0,0,0,0)",
          borderColor: solid ? "var(--color-outline-variant)" : "rgba(0,0,0,0)",
          y: hidden ? "-100%" : "0%",
        }}
        transition={reduceMotion ? { duration: 0 } : { ...COLOR_TRANSITION, y: SLIDE_TRANSITION }}
        onFocusCapture={() => setNavHidden(false)}
        className="border-b px-margin"
      >
        <div className="flex items-center justify-between h-16 md:h-20 gap-8">
          <Link
            href="/"
            className={cn(
              "text-xl transition-colors duration-500 ease-luxury",
              darkText ? "text-on-surface" : "text-hero-foreground",
            )}
          >
            <BrandWordmark />
          </Link>

          <nav className="hidden md:flex items-center gap-10">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "font-body text-label uppercase transition-colors duration-500 ease-luxury",
                  darkText
                    ? "text-on-surface-variant hover:text-secondary"
                    : "text-hero-muted hover:text-secondary",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className={cn(
              "md:hidden flex items-center justify-center p-2 -mr-2 transition-colors duration-500 ease-luxury",
              darkText ? "text-on-surface" : "text-hero-foreground",
            )}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            key="mobile-menu"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="md:hidden border-b border-outline-variant bg-background px-margin py-10 flex flex-col gap-6"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="font-body text-label uppercase text-on-surface-variant hover:text-secondary transition-colors duration-500 ease-luxury"
              >
                {link.label}
              </Link>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
