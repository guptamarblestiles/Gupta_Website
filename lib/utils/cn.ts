import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Our custom color tokens (defined in app/globals.css's @theme block) and
// our custom named font-size tokens both use the "text-" prefix, e.g.
// "text-hero-foreground" (a color) vs "text-label" (a font size). Stock
// tailwind-merge only recognizes Tailwind's *default* palette/scale names
// for disambiguating those two groups, so without this config it treats
// unknown "text-*" values as one ambiguous group and silently drops
// whichever came first — e.g. a button correctly styled with both
// `text-hero-foreground` (color) and `text-label` (size) would lose the
// color and fall back to an inherited (usually wrong) text color. This
// registers our tokens so both classes survive together.
const COLOR_TOKENS = [
  "background",
  "surface",
  "surface-variant",
  "surface-container",
  "on-surface",
  "on-surface-variant",
  "outline",
  "outline-variant",
  "secondary",
  "secondary-fixed",
  "secondary-fixed-dim",
  "secondary-strong",
  "on-secondary",
  "error",
  "hero-bg",
  "hero-surface",
  "hero-foreground",
  "hero-muted",
  "hero-border",
];

const FONT_SIZE_TOKENS = [
  "display",
  "display-mobile",
  "headline",
  "headline-sm",
  "body-lg",
  "body",
  "label",
];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "text-color": [{ text: COLOR_TOKENS }],
      "bg-color": [{ bg: COLOR_TOKENS }],
      "border-color": [{ border: COLOR_TOKENS }],
      "font-size": [{ text: FONT_SIZE_TOKENS }],
    },
  },
});

/**
 * Merge Tailwind class names safely, resolving conflicting utilities
 * (e.g. "px-4 px-8" -> "px-8") the way the last one wins — configured with
 * our custom design tokens so it doesn't mis-merge them (see above).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
