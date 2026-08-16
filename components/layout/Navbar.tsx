"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Collection", href: "/products" },
  { label: "About", href: "/#about" },
  { label: "Contact", href: "/#contact" },
];

type NavbarProps = {
  /**
   * "auto"  — starts transparent over a dark hero, switches to a solid
   *           light bar once the user scrolls past the hero (use on the
   *           homepage only).
   * "light" — always solid/light (use on catalogue, product, and every
   *           other page that doesn't open on a dark hero).
   */
  variant?: "auto" | "light";
};

export function Navbar({ variant = "light" }: NavbarProps) {
  const [scrolled, setScrolled] = useState(variant === "light");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (variant !== "auto") return;

    const heroHeight = window.innerHeight * 0.8;
    const onScroll = () => setScrolled(window.scrollY > heroHeight);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [variant]);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const isDark = variant === "auto" && !scrolled;

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-colors duration-500",
        isDark
          ? "bg-transparent border-b border-transparent"
          : "bg-background/90 backdrop-blur-xl border-b border-outline-variant/50",
      )}
    >
      <div className="container-max px-margin flex items-center justify-between h-16 md:h-20">
        <Link
          href="/"
          className={cn(
            "font-display text-xl md:text-2xl tracking-tight transition-colors duration-500",
            isDark ? "text-hero-foreground" : "text-on-surface",
          )}
        >
          GUPTA&apos;S
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "font-body text-label uppercase tracking-widest transition-colors duration-300",
                isDark
                  ? "text-hero-muted hover:text-hero-foreground"
                  : "text-on-surface-variant hover:text-secondary",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">
          <Button href="/products" variant={isDark ? "hero-secondary" : "secondary"} size="default">
            Catalogue
          </Button>
        </div>

        <button
          type="button"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
          className={cn(
            "md:hidden flex items-center justify-center p-2 -mr-2 transition-colors duration-300",
            isDark ? "text-hero-foreground" : "text-on-surface",
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
            <Button href="/products" variant="secondary" className="w-full">
              Catalogue
            </Button>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
