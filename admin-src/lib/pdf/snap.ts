/**
 * "Snap to tile edges": nudges a rough crop rectangle onto the tile's real
 * boundary near each of its sides, so a crop drawn once (or copied from
 * another page with the same layout) lands exactly on the tile on every
 * page. Deterministic; it only moves an edge to where the page itself has
 * a clear boundary, and leaves a side alone when it finds none.
 *
 * A tile boundary is a strong edge with plain background on the OUTSIDE.
 * Requiring that is what stops the snap from locking onto a bold line
 * inside an ornate tile's border pattern (textured on both sides).
 *
 * Works on raw RGBA pixels so it runs the same on a browser canvas and in
 * Node tests.
 */
import type { Rect } from "@admin/lib/pdf/geometry";

export type Pixels = { data: Uint8ClampedArray | Uint8Array; width: number; height: number };

type Side = "top" | "bottom" | "left" | "right";

function lum(img: Pixels, x: number, y: number): number {
  const i = (y * img.width + x) * 4;
  return 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2];
}

const STRIP = 4; // px of "outside" sampled to judge plainness

/**
 * Score for placing `side` at boundary `pos` (between pos-1 and pos).
 * edge = mean luminance jump across the boundary along the side's span;
 * texture = how busy the strip just outside is (a smooth gradient or flat
 * colour scores ~0, tile artwork scores high).
 */
function score(img: Pixels, side: Side, pos: number, a: number, b: number): number {
  const horizontal = side === "top" || side === "bottom";
  const limit = horizontal ? img.height : img.width;
  if (pos <= STRIP || pos >= limit - STRIP) return 0;
  let edge = 0;
  let texture = 0;
  let n = 0;
  for (let t = a; t <= b; t += 2) {
    if (horizontal) {
      edge += Math.abs(lum(img, t, pos) - lum(img, t, pos - 1));
      const outRow = side === "top" ? pos - 1 - (t % STRIP) : pos + (t % STRIP);
      texture += Math.abs(lum(img, t, outRow) - lum(img, Math.min(img.width - 1, t + 2), outRow));
    } else {
      edge += Math.abs(lum(img, pos, t) - lum(img, pos - 1, t));
      const outCol = side === "left" ? pos - 1 - (t % STRIP) : pos + (t % STRIP);
      texture += Math.abs(lum(img, outCol, t) - lum(img, outCol, Math.min(img.height - 1, t + 2)));
    }
    n++;
  }
  if (!n) return 0;
  return edge / n / (1 + texture / n / 3);
}

/** Best boundary within ±window of `at`; null unless it clearly stands out. */
function bestBoundary(img: Pixels, side: Side, at: number, window: number, a: number, b: number): number | null {
  const limit = side === "top" || side === "bottom" ? img.height : img.width;
  const scored: { pos: number; s: number }[] = [];
  for (let pos = Math.max(1, at - window); pos <= Math.min(limit - 1, at + window); pos++) {
    scored.push({ pos, s: score(img, side, pos, a, b) });
  }
  if (!scored.length) return null;
  const sorted = scored.map((x) => x.s).sort((p, q) => p - q);
  const median = sorted[Math.floor(sorted.length / 2)];
  const best = scored.reduce((p, q) => (q.s > p.s || (q.s === p.s && Math.abs(q.pos - at) < Math.abs(p.pos - at)) ? q : p));
  return best.s >= 10 && best.s >= median * 2.5 ? best.pos : null;
}

export function snapRect(img: Pixels, rect: Rect, windowFraction = 0.03): { rect: Rect; snappedSides: number } {
  const W = img.width;
  const H = img.height;
  let x0 = Math.round(rect.x * W);
  let y0 = Math.round(rect.y * H);
  let x1 = Math.round((rect.x + rect.w) * W);
  let y1 = Math.round((rect.y + rect.h) * H);
  const win = Math.max(4, Math.round(Math.max(W, H) * windowFraction));
  // Sample the middle 80% of each side so corners/neighbours don't dominate.
  const span = (p: number, q: number) => [Math.round(p + (q - p) * 0.1), Math.round(q - (q - p) * 0.1)] as const;
  const [hx0, hx1] = span(x0, x1);
  const [vy0, vy1] = span(y0, y1);

  const top = bestBoundary(img, "top", y0, win, hx0, hx1);
  const bottom = bestBoundary(img, "bottom", y1, win, hx0, hx1);
  const left = bestBoundary(img, "left", x0, win, vy0, vy1);
  const right = bestBoundary(img, "right", x1, win, vy0, vy1);
  let snapped = 0;
  if (top !== null) {
    y0 = top;
    snapped++;
  }
  if (bottom !== null) {
    y1 = bottom;
    snapped++;
  }
  if (left !== null) {
    x0 = left;
    snapped++;
  }
  if (right !== null) {
    x1 = right;
    snapped++;
  }

  if (x1 - x0 < 8 || y1 - y0 < 8) return { rect, snappedSides: 0 };
  return { rect: { x: x0 / W, y: y0 / H, w: (x1 - x0) / W, h: (y1 - y0) / H }, snappedSides: snapped };
}
