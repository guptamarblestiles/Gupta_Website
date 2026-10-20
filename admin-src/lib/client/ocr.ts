"use client";

/**
 * Optional OCR for pages whose text is part of a scanned picture (Gupta's
 * own catalogue prints the design number inside the artwork). Runs fully in
 * the browser with Tesseract.js — no API key or paid service. The first use
 * downloads the OCR engine and English language data (~15 MB) from the
 * jsDelivr CDN, then the browser caches them. If that download is blocked
 * or fails, OCR simply reports an error and the reviewer types the details.
 *
 * Settings were chosen by testing on the live source catalogue: plain
 * rendering + "sparse text" mode + blanking the tile artwork read the
 * design number on the pages tried; contrast filtering made it worse.
 */
import type { Rect } from "@admin/lib/pdf/geometry";
import type { TextItem } from "@admin/lib/pdf/textHints";

type Worker = Awaited<ReturnType<typeof import("tesseract.js")["createWorker"]>>;
let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  workerPromise ??= (async () => {
    const T = await import("tesseract.js");
    const worker = await T.createWorker("eng");
    await worker.setParameters({ tessedit_pageseg_mode: T.PSM.SPARSE_TEXT });
    return worker;
  })().catch((err) => {
    workerPromise = null;
    throw new Error(`Text reading (OCR) couldn't start: ${err instanceof Error ? err.message : "download blocked"}.`);
  });
  return workerPromise;
}

const MIN_CONFIDENCE = 60;

/** Read printed words from a rendered page, ignoring the tile areas. */
export async function ocrPage(page: HTMLCanvasElement, tileAreas: Rect[]): Promise<TextItem[]> {
  const canvas = document.createElement("canvas");
  canvas.width = page.width;
  canvas.height = page.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(page, 0, 0);
  ctx.fillStyle = "#ffffff";
  for (const r of tileAreas) ctx.fillRect(r.x * canvas.width, r.y * canvas.height, r.w * canvas.width, r.h * canvas.height);

  const worker = await getWorker();
  const { data } = await worker.recognize(canvas, {}, { blocks: true });
  const items: TextItem[] = [];
  for (const block of data.blocks ?? []) {
    for (const para of block.paragraphs) {
      for (const line of para.lines) {
        for (const w of line.words) {
          if (w.confidence < MIN_CONFIDENCE || !w.text.trim()) continue;
          items.push({
            str: w.text,
            x: w.bbox.x0 / canvas.width,
            y: w.bbox.y0 / canvas.height,
            w: (w.bbox.x1 - w.bbox.x0) / canvas.width,
            h: (w.bbox.y1 - w.bbox.y0) / canvas.height,
          });
        }
      }
    }
  }
  return items;
}

export async function stopOcr() {
  const w = await workerPromise?.catch(() => null);
  workerPromise = null;
  await w?.terminate();
}
