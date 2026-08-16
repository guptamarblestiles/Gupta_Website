/**
 * Site navbar. "auto" variant (homepage only) stays a persistent
 * glassmorphic bar over the hero — never flips to a solid light bar like it
 * used to — and animates the brand wordmark from left-aligned to visually
 * centered as the user scrolls, via Framer Motion's useScroll/useTransform
 * driving a measured x-offset (recomputed on resize since the offset
 * depends on actual rendered widths, not a fixed value). "light" variant
 * (every other page) is unchanged: always solid, no scroll animation.
 *
 * DEVIATION: the redesign spec's nav list includes "Catalogue" (a PDF
 * showcase page) — that page was explicitly deferred (no PDF files exist
 * yet), so it's left out of this nav rather than linking to a route that
 * doesn't exist. Add it back once app/catalogue/page.tsx exists.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Tiles", href: "/tiles" },
  { label: "About", href: "/#about" },
  { label: "Contact", href: "/#contact" },
];

const BRAND_NAME = "Gupta Marbles & Tiles";
const CENTER_SCROLL_RANGE = 240; // px of scroll over which the brand animates to center

type NavbarProps = {
  /**
   * "auto"  — persistent glassmorphic bar over a dark hero; brand animates
   *           left -> center as the user scrolls (homepage only).
   * "light" — always solid/light, no scroll animation (every other page).
   */
  variant?: "auto" | "light";
};

export function Navbar({ variant = "light" }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLAnchorElement>(null);
  const [centerOffset, setCenterOffset] = useState(0);

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
  const brandX = useTransform(scrollY, [0, CENTER_SCROLL_RANGE], [0, centerOffset]);
  const brandScale = useTransform(scrollY, [0, CENTER_SCROLL_RANGE], [1, 1.15]);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const isAuto = variant === "auto";

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-colors duration-500",
        isAuto
          ? "bg-zinc-950/40 backdrop-blur-md border-b border-white/10"
          : "bg-background/90 backdrop-blur-xl border-b border-outline-variant/50",
      )}
    >
      <div ref={containerRef} className="container-max px-margin flex items-center justify-between h-16 md:h-20">
        <motion.div style={isAuto ? { x: brandX, scale: brandScale } : undefined}>
          <Link
            ref={brandRef}
            href="/"
            className={cn(
              "block font-display text-lg md:text-xl tracking-tight transition-colors duration-500 whitespace-nowrap",
              isAuto ? "text-hero-foreground" : "text-on-surface",
            )}
          >
            {BRAND_NAME}
          </Link>
        </motion.div>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "font-body text-label uppercase tracking-widest transition-colors duration-300",
                isAuto
                  ? "text-hero-muted hover:text-secondary-fixed"
                  : "text-on-surface-variant hover:text-secondary",
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
            "md:hidden flex items-center justify-center p-2 -mr-2 transition-colors duration-300",
            isAuto ? "text-hero-foreground" : "text-on-surface",
          )}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            key="mobile-menu"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="md:hidden bg-background border-b border-outline-variant/50 px-margin py-8 flex flex-col gap-6"
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
    </header>
  );
}
