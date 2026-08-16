"use client";

import { useSyncExternalStore } from "react";

function subscribe(query: string, onChange: () => void) {
  const mql = window.matchMedia(query);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/**
 * SSR-safe media query hook built on useSyncExternalStore — the server
 * snapshot returns `null` (avoids a hydration mismatch, since the server
 * can't know the viewport), and the client snapshot tracks matchMedia
 * live via its change event.
 */
export function useMediaQuery(query: string): boolean | null {
  return useSyncExternalStore(
    (onChange) => subscribe(query, onChange),
    () => window.matchMedia(query).matches,
    () => null,
  );
}
