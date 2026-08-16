/**
 * Computes a CSS `matrix3d(...)` string that warps a rectangular element
 * (its own top-left corner at 0,0) onto an arbitrary quadrilateral — the
 * core trick behind the tile visualizer's perspective warp. Pure and
 * framework-free on purpose: reusable as-is for a future "upload your own
 * room + drag corners" mode (brief's explicit ask), not just fixed presets.
 *
 * Method: solve the projective transform mapping the unit square
 * (0,0)-(1,0)-(1,1)-(0,1) onto `corners` (closed-form, standard "unit
 * square to quadrilateral" homography — see e.g. Paul Heckbert's thesis,
 * or any "CSS corner pinning" writeup), then fold in a scale by
 * 1/elementWidth, 1/elementHeight so it applies directly to an element's
 * own pixel coordinates. Falls back to the identity transform for a
 * degenerate (zero-area) quad rather than dividing by zero.
 */
import type { Point } from "./presets";

export function cornersToMatrix3d(corners: [Point, Point, Point, Point], elementWidth: number, elementHeight: number): string {
  const [p0, p1, p2, p3] = corners;

  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const dy3 = p0.y - p1.y + p2.y - p3.y;

  const denom = dx1 * dy2 - dx2 * dy1;

  let a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number;

  if (denom === 0) {
    return "matrix3d(1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1)";
  }

  if (dx3 === 0 && dy3 === 0) {
    // Parallelogram case — affine, no perspective term needed.
    a = p1.x - p0.x;
    b = p2.x - p1.x;
    c = p0.x;
    d = p1.y - p0.y;
    e = p2.y - p1.y;
    f = p0.y;
    g = 0;
    h = 0;
  } else {
    g = (dx3 * dy2 - dx2 * dy3) / denom;
    h = (dx1 * dy3 - dy1 * dx3) / denom;
    a = p1.x - p0.x + g * p1.x;
    b = p3.x - p0.x + h * p3.x;
    c = p0.x;
    d = p1.y - p0.y + g * p1.y;
    e = p3.y - p0.y + h * p3.y;
    f = p0.y;
  }

  // Fold in the pre-scale by 1/elementWidth, 1/elementHeight so the matrix
  // maps the *element's* own pixel coordinates (0..elementWidth,
  // 0..elementHeight) rather than the unit square.
  const A = a / elementWidth;
  const B = b / elementHeight;
  const D = d / elementWidth;
  const E = e / elementHeight;
  const G = g / elementWidth;
  const H = h / elementHeight;

  // Standard embedding of a 3x3 planar homography [[A,B,c],[D,E,f],[G,H,1]]
  // into a CSS matrix3d (column-major 4x4).
  return `matrix3d(${A},${D},0,${G}, ${B},${E},0,${H}, 0,0,1,0, ${c},${f},0,1)`;
}
