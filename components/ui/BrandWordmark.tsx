"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils/cn";

const BRAND_NAME = "Gupta Interior";

/**
 * Three switchable wordmark treatments, picked via a temporary `?brand=`
 * query param for the client to compare — remove this query-param switch
 * (and the two unused variants) once a choice is made; default to "1"
 * until then. Each variant's font is self-hosted via @fontsource, loaded
 * in app/layout.tsx alongside the body/heading fonts.
 */
const VARIANT_CLASSES = {
  "1": "font-brand-marcellus uppercase tracking-[0.18em] text-[0.9em]",
  "2": "font-brand-cormorant font-semibold text-[1.2em]",
  "3": "font-brand-cinzel uppercase tracking-[0.15em] text-[0.9em]",
} as const;

type BrandVariant = keyof typeof VARIANT_CLASSES;

function isBrandVariant(value: string | null): value is BrandVariant {
  return value === "1" || value === "2" || value === "3";
}

function subscribeToSearch(callback: () => void) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

function getSearchSnapshot() {
  return window.location.search;
}

function getServerSearchSnapshot() {
  return "";
}

type BrandWordmarkProps = {
  className?: string;
};

/**
 * Shared brand-name text — used inside the Navbar's and Footer's own
 * <Link>, which keep owning color/transition classes (those differ: the
 * navbar's text color depends on scroll state, the footer's doesn't).
 * This component only ever controls the font/tracking/size, so a font
 * change (or picking the winning `?brand=` variant) is a one-line edit.
 */
export function BrandWordmark({ className }: BrandWordmarkProps) {
  const search = useSyncExternalStore(subscribeToSearch, getSearchSnapshot, getServerSearchSnapshot);
  const requested = new URLSearchParams(search).get("brand");
  const variant = isBrandVariant(requested) ? requested : "1";

  return (
    <span className={cn("whitespace-nowrap", VARIANT_CLASSES[variant], className)}>
      {BRAND_NAME}
    </span>
  );
}
