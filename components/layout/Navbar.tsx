/**
 * Site navbar — a floating glass pill (rounded-full, bg-white/15 +
 * backdrop-blur-xl + border-white/20 on "auto", inset from the viewport
 * edges rather than a full-width bar) sitting in the upper page area with
 * spacing on all sides, like Somany's navbar.
 *
 * Two explicit states on the "auto" variant, not a continuous scroll-scrub:
 *   Initial (scrollY <= SCROLL_THRESHOLD) — logo left, all nav links visible.
 *   Scrolled (scrollY > SCROLL_THRESHOLD) — nav links fade out, brand
 *     animates to center + scales up. Each Framer Motion `animate` prop
 *     below carries its own 300ms transition, so crossing the threshold
 *     always produces the same smooth animation regardless of scroll speed.
 * The center-offset itself is still measured (not a fixed px value) since
 * it depends on the pill's actual rendered width.
 *
 * Separately, `overLight` tracks a much larger threshold (roughly one
 * viewport height, i.e. past the dark hero) and switches the brand/nav
 * text from light to dark — the glass pill itself stays translucent
 * either way, but light-colored text over the page's white content
 * sections below the hero is invisible without this. Deliberately a
 * second, independent threshold from SCROLL_THRESHOLD: the nav-fade/
 * brand-center transition should happen almost immediately on scroll,
 * while the color swap must wait until the dark hero has actually
 * scrolled past, or the text would flip to dark while still over the
 * dark hero image.
 *
 * "light" variant (every other page) is the same floating pill shape in
 * a solid light finish always, no scroll animation.
 *
 * DEVIATION: the redesign spec's nav list includes "Catalogue" (a PDF
 * showcase page) — that page was explicitly deferred (no PDF files exist
 * yet), so it's left out of this nav rather than linking to a route that
 * doesn't exist. Add it back once app/catalogue/page.tsx exists.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Tiles", href: "/tiles" },
  { label: "About", href: "/#about" },
  { label: "Contact", href: "/#contact" },
];

const BRAND_NAME = "Gupta Marbles & Tiles";
const SCROLL_THRESHOLD = 60; // px scrolled before the navbar flips to its "scrolled" state
const STATE_TRANSITION = { duration: 0.3, ease: "easeInOut" as const };

type NavbarProps = {
  /**
   * "auto"  — persistent glass pill over a dark hero; brand animates
   *           left -> center as the user scrolls (homepage only).
   * "light" — same floating pill, solid light finish, no scroll animation.
   */
  variant?: "auto" | "light";
};

export function Navbar({ variant = "light" }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLAnchorElement>(null);
  const [centerOffset, setCenterOffset] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [overLight, setOverLight] = useState(false);

  useEffect(() => {
    if (variant !== "auto") return;
    function measure() {
      if (!containerRef.current || !brandRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      const brandCenterCurrent = brandRef.current.offsetLeft + brandRef.current.offsetWidth / 2;
      setCenterOffset(containerWidth / 2 - brandCenterCurrent);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [variant]);

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

  return (
    <div className="fixed top-4 md:top-6 inset-x-0 z-50 flex justify-center px-4">
      <motion.header
        animate={isAuto ? { opacity: scrolled ? 1 : 0.85 } : undefined}
        transition={STATE_TRANSITION}
        className={cn(
          "w-full max-w-5xl rounded-full border transition-colors duration-500",
          isAuto
            ? "bg-white/15 backdrop-blur-xl border-white/20"
            : "bg-background/90 backdrop-blur-xl border-outline-variant/50 shadow-sm",
        )}
      >
        <div
          ref={containerRef}
          className="flex items-center justify-between h-14 md:h-16 px-5 md:px-8"
        >
          <motion.div
            animate={isAuto ? { x: scrolled ? centerOffset : 0, scale: scrolled ? 1.15 : 1 } : undefined}
            transition={STATE_TRANSITION}
          >
            <Link
              ref={brandRef}
              href="/"
              className={cn(
                "block font-display text-base md:text-lg tracking-tight transition-colors duration-500 whitespace-nowrap",
                isAuto ? (overLight ? "text-on-surface" : "text-hero-foreground") : "text-on-surface",
              )}
            >
              {BRAND_NAME}
            </Link>
          </motion.div>

          <motion.nav
            animate={isAuto ? { opacity: scrolled ? 0 : 1 } : undefined}
            transition={STATE_TRANSITION}
            aria-hidden={isAuto && scrolled}
            style={isAuto ? { pointerEvents: scrolled ? "none" : "auto" } : undefined}
            className="hidden md:flex items-center gap-7"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                tabIndex={isAuto && scrolled ? -1 : undefined}
                className={cn(
                  "font-body text-label uppercase tracking-widest transition-colors duration-300",
                  isAuto
                    ? overLight
                      ? "text-on-surface-variant hover:text-secondary"
                      : "text-hero-muted hover:text-secondary-fixed"
                    : "text-on-surface-variant hover:text-secondary",
                )}
              >
                {link.label}
              </Link>
            ))}
          </motion.nav>

          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className={cn(
              "md:hidden flex items-center justify-center p-2 -mr-2 transition-colors duration-300",
              isAuto ? (overLight ? "text-on-surface" : "text-hero-foreground") : "text-on-surface",
            )}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            key="mobile-menu"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="md:hidden absolute top-full mt-3 w-[calc(100%-2rem)] max-w-5xl rounded-3xl border border-outline-variant/50 bg-background/95 backdrop-blur-xl shadow-lg px-6 py-8 flex flex-col gap-6"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="font-body text-label uppercase tracking-widest text-on-surface-variant hover:text-secondary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}
