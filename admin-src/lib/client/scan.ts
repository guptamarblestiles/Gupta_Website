"use client";

/**
 * Finds tile candidates on one PDF page, entirely in the browser:
 *
 * 1. Embedded artwork: raster images drawn on the page (lib/pdf/geometry).
 * 2. Flat pages (the whole page is one scanned picture — how Gupta's own
 *    catalogue is made): uses the reviewer's "template" box, snapped onto
 *    the tile edges on each page (lib/pdf/snap). Without a template the
 *    page is reported as needing a box; nothing is guessed.
 * 3. Text: the PDF's text layer, or OCR of the rendered page when there is
 *    none and OCR is switched on.
 * 4. Each crop is re-rendered from the PDF at high resolution, uploaded to
 *    the "tiles" bucket under pdf-imports/<pdf>/, and saved as a candidate.
 */
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { detectTiles, renderCrop } from "@admin/lib/client/pdf";
import { pageText } from "@admin/lib/client/pdf";
import { ocrPage } from "@admin/lib/client/ocr";
import { uploadBlob } from "@admin/lib/client/uploads";
import { extensionFor } from "@admin/lib/client/files";
import { snapRect } from "@admin/lib/pdf/snap";
import { groupLines, suggestForBox, type Line, type Suggestion } from "@admin/lib/pdf/textHints";
import type { DetectedBox, Rect } from "@admin/lib/pdf/geometry";
import type { NewCandidate } from "@admin/lib/catalogue/candidate";

const SNAP_RENDER_WIDTH = 1400;

export type ScanResult = { items: NewCandidate[]; needsBox: boolean; usedOcr: boolean; textFound: boolean };

async function renderForAnalysis(page: PDFPageProxy): Promise<HTMLCanvasElement> {
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: SNAP_RENDER_WIDTH / base.width });
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  await page.render({ canvas, canvasContext: canvas.getContext("2d", { willReadFrequently: true })!, viewport }).promise;
  return canvas;
}

export function snapOnCanvas(canvas: HTMLCanvasElement, rect: Rect): Rect {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return snapRect(img, rect).rect;
}

async function readLines(page: PDFPageProxy, analysis: () => Promise<HTMLCanvasElement>, boxes: Rect[], useOcr: boolean) {
  let lines: Line[] = groupLines(await pageText(page));
  let usedOcr = false;
  if (!lines.length && useOcr) {
    lines = groupLines(await ocrPage(await analysis(), boxes));
    usedOcr = true;
  }
  return { lines, usedOcr };
}

function toValues(s: Suggestion): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(s)) out[k] = v === null || v === undefined ? null : String(v);
  return out;
}

async function cropAndUpload(page: PDFPageProxy, box: Rect, path: string) {
  const crop = await renderCrop(page, box);
  const url = await uploadBlob(crop.blob, `${path}.${extensionFor(crop.blob)}`);
  return { url, path: `${path}.${extensionFor(crop.blob)}`, width: crop.width, height: crop.height };
}

export async function scanPage(opts: {
  doc: PDFDocumentProxy;
  pageNumber: number;
  pdfSlug: string;
  template: Rect | null;
  useOcr: boolean;
}): Promise<ScanResult> {
  const page = await opts.doc.getPage(opts.pageNumber);
  let analysisCanvas: HTMLCanvasElement | null = null;
  const analysis = async () => (analysisCanvas ??= await renderForAnalysis(page));

  const detected = await detectTiles(page, opts.pageNumber);
  let boxes: DetectedBox[] = detected.filter((b) => !b.flags.includes("full_page"));
  let needsBox = false;
  if (!boxes.length) {
    if (opts.template) {
      const snapped = snapOnCanvas(await analysis(), opts.template);
      boxes = [{ ...snapped, key: `t-p${opts.pageNumber}`, flags: [] }];
    } else {
      needsBox = true;
    }
  }

  const { lines, usedOcr } = boxes.length ? await readLines(page, analysis, boxes, opts.useOcr) : { lines: [], usedOcr: false };
  const items: NewCandidate[] = [];
  for (const box of boxes) {
    const { suggested, warnings } = suggestForBox(box, lines, box.flags, boxes.length === 1);
    const up = await cropAndUpload(page, box, `pdf-imports/${opts.pdfSlug}/${box.key}`);
    items.push({
      page: opts.pageNumber,
      crop: { x: box.x, y: box.y, w: box.w, h: box.h },
      crop_key: box.key,
      image_path: up.path,
      image_url: up.url,
      image_width: up.width,
      image_height: up.height,
      detection: box.key.startsWith("t-") ? "manual" : "embedded_image",
      suggested: toValues(suggested),
      warnings,
    });
  }
  page.cleanup();
  return { items, needsBox, usedOcr, textFound: lines.length > 0 };
}

/** A box the reviewer drew (already snapped by the caller if wanted). */
export async function cropManual(opts: { doc: PDFDocumentProxy; pageNumber: number; pdfSlug: string; rect: Rect; useOcr: boolean }): Promise<NewCandidate> {
  const page = await opts.doc.getPage(opts.pageNumber);
  let analysisCanvas: HTMLCanvasElement | null = null;
  const analysis = async () => (analysisCanvas ??= await renderForAnalysis(page));
  const { lines } = await readLines(page, analysis, [opts.rect], opts.useOcr);
  const { suggested, warnings } = suggestForBox(opts.rect, lines, [], true);
  const id = crypto.randomUUID().slice(0, 12);
  const up = await cropAndUpload(page, opts.rect, `pdf-imports/${opts.pdfSlug}/m-p${opts.pageNumber}-${id}`);
  return {
    page: opts.pageNumber,
    crop: opts.rect,
    crop_key: null,
    image_path: up.path,
    image_url: up.url,
    image_width: up.width,
    image_height: up.height,
    detection: "manual",
    suggested: toValues(suggested),
    warnings,
  };
}
