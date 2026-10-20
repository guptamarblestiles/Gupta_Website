/**
 * Finds where raster images (the actual tile artwork) are drawn on a PDF
 * page, from pdf.js's operator list. This is the browser equivalent of the
 * legacy PyMuPDF script (DR TRADERS DATA/.../extract_images.py, which used
 * page.get_images()), but it also recovers each image's on-page position,
 * so the crop is taken from the real page at the real proportions instead
 * of a hard-coded crop box like the old crop_tiles.py.
 *
 * Pure functions only — no pdf.js import — so they're unit-testable.
 */

export type Matrix = [number, number, number, number, number, number];
export type Rect = { x: number; y: number; w: number; h: number };

/** Operator ids this module cares about, taken from pdfjs `OPS` at runtime. */
export type OpIds = {
  save: number;
  restore: number;
  transform: number;
  paintFormXObjectBegin: number;
  paintFormXObjectEnd: number;
  paintImageXObject: number;
  paintInlineImageXObject: number;
};

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** m1 × m2 in PDF's row-vector convention (same as pdf.js Util.transform). */
export function multiply(m1: Matrix, m2: Matrix): Matrix {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

function apply(m: Matrix, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

/** Images are painted into the unit square under the current matrix. */
function unitSquareBounds(m: Matrix): { x0: number; y0: number; x1: number; y1: number } {
  const pts = [apply(m, 0, 0), apply(m, 1, 0), apply(m, 0, 1), apply(m, 1, 1)];
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

export type ImageBounds = { x0: number; y0: number; x1: number; y1: number; pxW?: number; pxH?: number };

/** Image bounds in PDF user space, in drawing order. */
export function imageBoundsFromOps(
  fnArray: ArrayLike<number>,
  argsArray: ArrayLike<unknown>,
  ops: OpIds,
): ImageBounds[] {
  const stack: Matrix[] = [];
  let ctm: Matrix = IDENTITY;
  const out: ImageBounds[] = [];

  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i];
    const args = argsArray[i] as unknown[] | null;
    if (fn === ops.save) {
      stack.push(ctm);
    } else if (fn === ops.restore) {
      ctm = stack.pop() ?? IDENTITY;
    } else if (fn === ops.transform && args) {
      ctm = multiply(ctm, args as Matrix);
    } else if (fn === ops.paintFormXObjectBegin) {
      stack.push(ctm);
      const matrix = args?.[0];
      if (Array.isArray(matrix) && matrix.length === 6) ctm = multiply(ctm, matrix as Matrix);
    } else if (fn === ops.paintFormXObjectEnd) {
      ctm = stack.pop() ?? IDENTITY;
    } else if (fn === ops.paintImageXObject || fn === ops.paintInlineImageXObject) {
      // pdf.js passes [objId, width, height] — the image's native pixel size.
      const pxW = typeof args?.[1] === "number" ? (args[1] as number) : undefined;
      const pxH = typeof args?.[2] === "number" ? (args[2] as number) : undefined;
      out.push({ ...unitSquareBounds(ctm), ...(pxW && pxH ? { pxW, pxH } : {}) });
    }
  }
  return out;
}

export type DetectedBox = Rect & { key: string; flags: BoxFlag[] };
export type BoxFlag = "full_page" | "extreme_aspect" | "low_resolution";
export type SourceBox = Rect & { pxW?: number; pxH?: number };

/** Below this many source pixels on the long side, a crop looks soft on a product page. */
export const MIN_SOURCE_PX = 500;

export const MIN_AREA = 0.012; // ~1.2% of the page: smaller is a logo/icon
const MIN_SIDE = 0.05;
const DUPLICATE_IOU = 0.9;

export function iou(a: Rect, b: Rect): number {
  const x0 = Math.max(a.x, b.x);
  const y0 = Math.max(a.y, b.y);
  const x1 = Math.min(a.x + a.w, b.x + b.w);
  const y1 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
  const union = a.w * a.h + b.w * b.h - inter;
  return union > 0 ? inter / union : 0;
}

function contains(outer: Rect, inner: Rect, slack = 0.01): boolean {
  return (
    inner.x >= outer.x - slack &&
    inner.y >= outer.y - slack &&
    inner.x + inner.w <= outer.x + outer.w + slack &&
    inner.y + inner.h <= outer.y + outer.h + slack
  );
}

export function boxKey(page: number, r: Rect): string {
  const q = (n: number) => Math.round(n * 1000);
  return `p${page}-${q(r.x)}-${q(r.y)}-${q(r.w)}-${q(r.h)}`;
}

/**
 * Normalized (0..1, top-left origin) boxes -> tile candidates.
 * Drops icons/logos, duplicate draws of the same image, and large
 * backgrounds that merely contain the real tile images. Flags (does not
 * drop) full-page images and odd shapes for human review.
 */
export function selectTileBoxes(page: number, boxes: SourceBox[]): DetectedBox[] {
  const clipped: SourceBox[] = boxes
    .map((b) => {
      const x = Math.max(0, b.x);
      const y = Math.max(0, b.y);
      return { x, y, w: Math.min(1, b.x + b.w) - x, h: Math.min(1, b.y + b.h) - y, pxW: b.pxW, pxH: b.pxH };
    })
    .filter((b) => b.w >= MIN_SIDE && b.h >= MIN_SIDE && b.w * b.h >= MIN_AREA);

  const unique: SourceBox[] = [];
  for (const b of clipped) {
    if (!unique.some((u) => iou(u, b) > DUPLICATE_IOU)) unique.push(b);
  }

  const kept = unique.filter((b) => {
    if (b.w * b.h < 0.45) return true;
    const inside = unique.filter((o) => o !== b && contains(b, o));
    return inside.length < 2; // a backdrop behind several tiles is not itself a tile
  });

  return kept
    .sort((a, b) => (Math.abs(a.y - b.y) > 0.02 ? a.y - b.y : a.x - b.x))
    .map((b) => {
      const flags: BoxFlag[] = [];
      if (b.w * b.h > 0.8) flags.push("full_page");
      const ratio = b.w / b.h;
      if (ratio > 6 || ratio < 1 / 6) flags.push("extreme_aspect");
      if (b.pxW && b.pxH && Math.max(b.pxW, b.pxH) < MIN_SOURCE_PX) flags.push("low_resolution");
      return { x: b.x, y: b.y, w: b.w, h: b.h, key: boxKey(page, b), flags };
    });
}

/** User-space image bounds -> 0..1 page fractions (top-left origin), using
 *  the viewport's point converter so page rotation is respected. */
export function toPageFractions(
  bounds: ImageBounds[],
  viewport: { width: number; height: number; convertToViewportPoint: (x: number, y: number) => number[] },
): SourceBox[] {
  return bounds.map((b) => {
    const [ax, ay] = viewport.convertToViewportPoint(b.x0, b.y0);
    const [bx, by] = viewport.convertToViewportPoint(b.x1, b.y1);
    return {
      x: Math.min(ax, bx) / viewport.width,
      y: Math.min(ay, by) / viewport.height,
      w: Math.abs(bx - ax) / viewport.width,
      h: Math.abs(by - ay) / viewport.height,
      pxW: b.pxW,
      pxH: b.pxH,
    };
  });
}
