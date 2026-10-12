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
 * "light" variant (every other page) is the same flat bar, always solid,
 * no scroll animation.
 *
 * DEVIATION: the redesign spec's nav list includes "Catalogue" (a PDF
 * showcase page) — that page was explicitly deferred (no PDF files exist
 * yet), so it's left out of this nav rather than linking to a route that
 * doesn't exist. Add it back once app/catalogue/page.tsx exists.
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Materials", href: "/tiles" },
  { label: "Collections", href: "/collections" },
  { label: "About", href: "/#about" },
  { label: "Contact", href: "/contact" },
];

const BRAND_NAME = "Gupta Interior";
const SCROLL_THRESHOLD = 60; // px scrolled before the bar gains its solid background
const COLOR_TRANSITION = { duration: 0.5, ease: "easeInOut" as const };

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

  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (latest) => {
    if (variant !== "auto") return;
    setScrolled(latest > SCROLL_THRESHOLD);
    setOverLight(latest > window.innerHeight * 0.8);
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

  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <motion.div
        animate={{
          backgroundColor: solid ? "var(--color-background)" : "rgba(0,0,0,0)",
          borderColor: solid ? "var(--color-outline-variant)" : "rgba(0,0,0,0)",
        }}
        transition={COLOR_TRANSITION}
        className="border-b px-margin"
      >
        <div className="flex items-center justify-between h-16 md:h-20 gap-8">
          <Link
            href="/"
            className={cn(
              "font-display text-xl tracking-tight transition-colors duration-500 ease-luxury whitespace-nowrap",
              darkText ? "text-on-surface" : "text-hero-foreground",
            )}
          >
            {BRAND_NAME}
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "font-body text-label transition-colors duration-200 ease-luxury",
                  darkText
                    ? "text-on-surface-variant hover:text-on-surface"
                    : "text-hero-muted hover:text-hero-foreground",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:block">
            <Button
              href="/contact"
              variant={darkText ? "primary" : "hero-primary"}
              size="default"
              className="h-10 px-6"
            >
              Enquire Now
            </Button>
          </div>

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
                className="font-body text-label text-on-surface-variant hover:text-on-surface transition-colors duration-200 ease-luxury"
              >
                {link.label}
              </Link>
            ))}
            <Button href="/contact" variant="primary" onClick={() => setMobileOpen(false)}>
              Enquire Now
            </Button>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
