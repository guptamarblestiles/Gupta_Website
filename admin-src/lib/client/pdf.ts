"use client";

/**
 * pdf.js glue for the browser. All PDF reading, rendering and cropping
 * happens on the admin's own device: the original file is only ever read
 * (from its public Storage URL or the local File), never modified, and no
 * server function has to hold a 50 MB PDF in memory.
 */
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { imageBoundsFromOps, selectTileBoxes, toPageFractions, type DetectedBox, type Rect } from "@admin/lib/pdf/geometry";
import type { TextItem } from "@admin/lib/pdf/textHints";

type PdfJs = typeof import("pdfjs-dist");
let pdfjsPromise: Promise<PdfJs> | null = null;

export function loadPdfJs(): Promise<PdfJs> {
  pdfjsPromise ??= import("pdfjs-dist").then((m) => {
    m.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    return m;
  });
  return pdfjsPromise;
}

export type OpenPdf = { doc: PDFDocumentProxy; close: () => Promise<void> };

export async function openPdf(source: { url: string } | { data: ArrayBuffer }): Promise<OpenPdf> {
  const pdfjs = await loadPdfJs();
  const task = pdfjs.getDocument("url" in source ? { url: source.url } : { data: new Uint8Array(source.data) });
  return { doc: await task.promise, close: () => task.destroy() };
}

/** Page count + embedded title. Throws for anything that isn't a readable PDF. */
export async function readPdfInfo(data: ArrayBuffer): Promise<{ pageCount: number; title: string | null }> {
  const { doc, close } = await openPdf({ data: data.slice(0) });
  try {
    const meta = await doc.getMetadata().catch(() => null);
    const info = (meta?.info ?? {}) as { Title?: unknown };
    const title = typeof info.Title === "string" && info.Title.trim().length > 2 ? info.Title.trim() : null;
    return { pageCount: doc.numPages, title };
  } finally {
    await close();
  }
}

/** Text runs on the page as 0..1 fractions with a top-left origin. */
export async function pageText(page: PDFPageProxy): Promise<TextItem[]> {
  const pdfjs = await loadPdfJs();
  const viewport = page.getViewport({ scale: 1 });
  const content = await page.getTextContent();
  const items: TextItem[] = [];
  for (const raw of content.items) {
    if (!("str" in raw) || !raw.str.trim()) continue;
    const tx = pdfjs.Util.transform(viewport.transform, raw.transform);
    const h = Math.hypot(tx[2], tx[3]) || raw.height || 1;
    items.push({
      str: raw.str,
      x: tx[4] / viewport.width,
      y: (tx[5] - h) / viewport.height,
      w: (raw.width * viewport.scale) / viewport.width,
      h: h / viewport.height,
    });
  }
  return items;
}

/** Tile-sized raster images drawn on the page (see lib/pdf/geometry.ts). */
export async function detectTiles(page: PDFPageProxy, pageNumber: number): Promise<DetectedBox[]> {
  const pdfjs = await loadPdfJs();
  const viewport = page.getViewport({ scale: 1 });
  const list = await page.getOperatorList();
  const bounds = imageBoundsFromOps(list.fnArray, list.argsArray, pdfjs.OPS);
  return selectTileBoxes(pageNumber, toPageFractions(bounds, viewport));
}

/** Render a whole page into a canvas sized to `targetWidth` CSS pixels. */
export async function renderPage(page: PDFPageProxy, canvas: HTMLCanvasElement, targetWidth: number) {
  const base = page.getViewport({ scale: 1 });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const viewport = page.getViewport({ scale: (targetWidth / base.width) * dpr });
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
  canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
  const task = page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport });
  await task.promise;
  return { cssWidth: viewport.width / dpr, cssHeight: viewport.height / dpr };
}

const CROP_TARGET_PX = 1600;

/**
 * Re-renders only the crop region from the vector/raster page data at high
 * resolution (not an upscaled screenshot), keeping its exact proportions.
 */
export async function renderCrop(page: PDFPageProxy, rect: Rect): Promise<{ blob: Blob; width: number; height: number }> {
  const base = page.getViewport({ scale: 1 });
  const longestPt = Math.max(rect.w * base.width, rect.h * base.height);
  const scale = Math.min(6, Math.max(1.5, CROP_TARGET_PX / longestPt));
  const full = page.getViewport({ scale });
  const viewport = page.getViewport({ scale, offsetX: -rect.x * full.width, offsetY: -rect.y * full.height });
  const width = Math.max(1, Math.round(rect.w * full.width));
  const height = Math.max(1, Math.round(rect.h * full.height));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  const blob = await canvasToImage(canvas);
  return { blob, width, height };
}

/** WebP where the browser can encode it (Chrome, Edge, Firefox, Android);
 *  high-quality JPEG otherwise (older Safari). */
export async function canvasToImage(canvas: HTMLCanvasElement): Promise<Blob> {
  const webp = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.88));
  if (webp && webp.type === "image/webp") return webp;
  const jpeg = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9));
  if (!jpeg) throw new Error("This browser couldn't create the image. Try Chrome or Edge.");
  return jpeg;
}
