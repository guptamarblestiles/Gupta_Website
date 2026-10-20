/**
 * Deterministic suggestions for a tile crop, from the PDF's own text layer.
 * Every value is a SUGGESTION shown to a reviewer, with a warning whenever
 * it is weak (taken from the page rather than next to the tile, or not
 * found at all). Nothing here invents a value: no match -> null.
 */
import { normalizeSize, normalizeThickness } from "@admin/lib/catalogue/normalize";
import { FINISH_KEYWORDS, SIZE_PATTERNS } from "@admin/lib/pdf/vocab";
import type { Rect } from "@admin/lib/pdf/geometry";

/** A run of text, normalized to page fractions with a top-left origin. */
export type TextItem = { str: string; x: number; y: number; w: number; h: number };
export type Line = { text: string; x: number; y: number; w: number; h: number };

export type Suggestion = {
  name: string | null;
  product_code: string | null;
  size: string | null;
  finish: string | null;
  thickness: string | null;
  series: string | null;
  application: string | null;
  material: string | null;
  faces: number | null;
};

const EMPTY: Suggestion = {
  name: null,
  product_code: null,
  size: null,
  finish: null,
  thickness: null,
  series: null,
  application: null,
  material: null,
  faces: null,
};

export type WarningCode =
  | "no_text"
  | "no_code"
  | "code_from_page"
  | "no_name"
  | "size_from_page"
  | "finish_from_page"
  | "full_page"
  | "extreme_aspect"
  | "low_resolution"
  | "duplicate_code";

export const WARNING_TEXT: Record<WarningCode, string> = {
  no_text: "This page has no readable text (it may be a scanned image). Enter the details by hand.",
  no_code: "No product code found next to this tile.",
  code_from_page: "Code is the most prominent number on the page — check it belongs to this tile.",
  no_name: "No design name found next to this tile.",
  size_from_page: "Size was read from elsewhere on the page — check it applies to this tile.",
  finish_from_page: "Finish was read from elsewhere on the page — check it applies to this tile.",
  full_page: "This image fills most of the page. It may be a room photo rather than a single tile.",
  extreme_aspect: "Unusual shape — check the crop shows the whole tile.",
  low_resolution: "Low resolution crop. It may look blurry on the website.",
  duplicate_code: "A product with this code already exists.",
};

/** Merge text runs into visual lines (same baseline, left to right). */
export function groupLines(items: TextItem[]): Line[] {
  const sorted = items.filter((i) => i.str.trim()).sort((a, b) => a.y - b.y || a.x - b.x);
  const lines: Line[] = [];
  for (const item of sorted) {
    const last = lines[lines.length - 1];
    const tolerance = Math.max(item.h, last?.h ?? 0) * 0.5;
    const gap = last ? item.x - (last.x + last.w) : 0;
    // A wide gap on the same baseline is a neighbouring tile's caption, not
    // the rest of this line.
    const maxGap = Math.max(0.04, item.h * 2.5);
    if (last && Math.abs(last.y - item.y) <= tolerance && gap >= -0.02 && gap <= maxGap) {
      last.text += gap > item.h * 0.15 ? ` ${item.str}` : item.str;
      last.w = item.x + item.w - last.x;
      last.h = Math.max(last.h, item.h);
    } else {
      lines.push({ text: item.str, x: item.x, y: item.y, w: item.w, h: item.h });
    }
  }
  return lines.map((l) => ({ ...l, text: l.text.replace(/\s+/g, " ").trim() })).filter((l) => l.text);
}

const SIZE_TOKEN = /\b\d{2,4}\s*[xX×*]\s*\d{2,4}\b/g;
const CODE_RE = /\b(?=[A-Z0-9./-]*\d)[A-Z][A-Z0-9./-]{1,}[A-Z0-9]\b|\b\d{3,6}(?:[-/][A-Z0-9]{1,6})?\b/gi;
// Note: 4-digit numbers like 2008 are NOT excluded as "years" — Gupta's own
// catalogue uses design numbers such as 2001/2008/3505.
const NOT_CODES = /^(?:\d{1,2}|\d+mm|\d+cm|mm|cm|pcs|sqm|sqft)$/i;

export function findCode(text: string): string | null {
  const withoutSizes = text.replace(SIZE_TOKEN, " ").replace(/\b\d+(?:\.\d+)?\s*(?:mm|cm|ft|pcs|sq\.?\s*(?:ft|m))\b/gi, " ");
  for (const match of withoutSizes.matchAll(CODE_RE)) {
    const token = match[0].replace(/[./-]+$/, "");
    if (!NOT_CODES.test(token)) return token.toUpperCase();
  }
  return null;
}

export function findSize(text: string): string | null {
  for (const pattern of SIZE_PATTERNS) {
    const m = text.match(pattern);
    if (m) {
      const raw = m[0].replace(/[×*]/g, "x");
      // A bare "600x1200" in a tile catalogue is millimetres.
      return normalizeSize(/\d\s*$/.test(raw) && Number(raw.split(/x/i)[0]) >= 100 ? `${raw}mm` : raw);
    }
  }
  return null;
}

export function findFinish(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [keyword, value] of Object.entries(FINISH_KEYWORDS)) {
    if (new RegExp(`\\b${keyword.replace(/[-]/g, "[- ]?")}\\b`).test(lower)) return value;
  }
  return null;
}

export function findThickness(text: string): string | null {
  const explicit = text.match(/thick(?:ness)?\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*mm/i) ?? text.match(/(\d+(?:\.\d+)?)\s*mm\s*thick/i);
  if (explicit) return normalizeThickness(`${explicit[1]} mm`);
  return null;
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function findSeries(text: string): string | null {
  for (const m of text.matchAll(/\b([A-Za-z][A-Za-z0-9&' ]{1,40}?)\s+(series|collection)\b/gi)) {
    const label = m[1].trim().replace(/^surface\s+/i, "");
    // "Surface Matt Series" names a finish, not a collection.
    if (!label || (label.split(" ").length === 1 && findFinish(label))) continue;
    return titleCase(`${label} ${m[2]}`);
  }
  return null;
}

const MATERIALS: [RegExp, string][] = [
  [/\bfull\s*body\b/i, "Full Body Vitrified"],
  [/\bdouble\s*charge\b/i, "Double Charge Vitrified"],
  [/\bp\.?g\.?v\.?t\b/i, "PGVT"],
  [/\bg\.?v\.?t\b/i, "GVT"],
  [/\bporcelain\b/i, "Porcelain"],
  [/\bvitrified\b/i, "Vitrified"],
  [/\bceramic\b/i, "Ceramic"],
];

export function findMaterial(text: string): string | null {
  for (const [re, value] of MATERIALS) if (re.test(text)) return value;
  return null;
}

/** "FACES 01", "Faces: 4", "4 Faces". */
export function findFaces(text: string): number | null {
  const m = text.match(/\bfaces?\s*[:-]?\s*(\d{1,2})\b/i) ?? text.match(/\b(\d{1,2})\s*faces?\b/i);
  const n = m ? Number(m[1]) : NaN;
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** The largest-printed code-like token on the page (catalogues that print
 *  one design per page usually show its number big). */
export function prominentCode(lines: Line[]): string | null {
  for (const line of [...lines].sort((a, b) => b.h - a.h)) {
    if (/faces?/i.test(line.text)) continue;
    const code = findCode(line.text);
    if (code) return code;
  }
  return null;
}

export function findApplication(text: string): string | null {
  const lower = text.toLowerCase();
  const wall = /\bwall\b/.test(lower);
  const floor = /\bfloor(?:ing)?\b/.test(lower);
  if (wall && floor) return "Both";
  if (wall) return "Wall";
  if (floor) return "Floor";
  return null;
}

/** Lines that read as a caption for `box`: just below or just above it,
 *  overlapping it horizontally. Nearest first. */
export function captionLines(box: Rect, lines: Line[]): Line[] {
  const left = box.x - box.w * 0.15;
  const right = box.x + box.w * 1.15;
  const bottom = box.y + box.h;
  return lines
    // A line much wider than the tile is page-level text (a heading or a
    // spec strip shared by every tile), not this tile's caption.
    .filter((l) => l.x < right && l.x + l.w > left && l.w <= box.w * 1.6)
    .map((l) => {
      const center = l.y + l.h / 2;
      if (center >= bottom - 0.005 && center <= bottom + 0.1) return { l, d: center - bottom };
      // Text above a tile is usually a page heading; prefer text below.
      if (center <= box.y + 0.005 && center >= box.y - 0.05) return { l, d: 0.02 + (box.y - center) * 3 };
      return null;
    })
    .filter((x): x is { l: Line; d: number } => x !== null)
    .sort((a, b) => a.d - b.d)
    .map((x) => x.l);
}

function nameFrom(lines: Line[], code: string | null): string | null {
  for (const line of lines) {
    // Compilation PDFs often caption each photo with its file name.
    let text = line.text.replace(/\.(?:jpe?g|png|webp|tiff?|bmp)\b/gi, " ");
    if (code) text = text.replace(new RegExp(code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), " ");
    text = text.replace(SIZE_TOKEN, " ").replace(/\b\d+(?:\.\d+)?\s*(?:mm|cm)\b/gi, " ");
    text = text.replace(/^[\s:|,-]+|[\s:|,-]+$/g, "").replace(/\s+/g, " ");
    if (/[a-z]{3,}/i.test(text) && text.length <= 60 && !findFinish(text)) return text;
  }
  return null;
}

/**
 * @param onlyTileOnPage - true when this is the single tile candidate on its
 *   page; then the page's most prominent code may be used (with a warning).
 */
export function suggestForBox(
  box: Rect,
  lines: Line[],
  flags: string[] = [],
  onlyTileOnPage = false,
): { suggested: Suggestion; warnings: WarningCode[] } {
  const warnings: WarningCode[] = [];
  if (flags.includes("full_page")) warnings.push("full_page");
  if (flags.includes("extreme_aspect")) warnings.push("extreme_aspect");
  if (flags.includes("low_resolution")) warnings.push("low_resolution");

  if (lines.length === 0) {
    warnings.push("no_text");
    return { suggested: { ...EMPTY }, warnings };
  }

  const captions = captionLines(box, lines).slice(0, 3);
  const captionText = captions.map((l) => l.text).join(" \n ");
  const pageText = lines.map((l) => l.text).join(" \n ");

  let product_code = captions.length ? findCode(captionText) : null;
  if (!product_code && onlyTileOnPage) {
    product_code = prominentCode(lines);
    if (product_code) warnings.push("code_from_page");
  }
  if (!product_code) warnings.push("no_code");

  const name = nameFrom(captions, product_code);
  if (!name) warnings.push("no_name");

  let size = findSize(captionText);
  if (!size) {
    size = findSize(pageText);
    if (size) warnings.push("size_from_page");
  }

  let finish = findFinish(captionText);
  if (!finish) {
    finish = findFinish(pageText);
    if (finish) warnings.push("finish_from_page");
  }

  return {
    suggested: {
      name,
      product_code,
      size,
      finish,
      thickness: findThickness(captionText) ?? findThickness(pageText),
      series: findSeries(pageText),
      application: findApplication(captionText) ?? findApplication(pageText),
      material: findMaterial(captionText) ?? findMaterial(pageText),
      faces: findFaces(pageText),
    },
    warnings,
  };
}
