/**
 * Dry-run the PDF tile detector on local catalogue PDFs, with no browser,
 * no upload and no database: prints what the import screen would propose
 * for each page. Read-only — the PDFs are never modified.
 *
 * Usage: npx tsx scripts/try-extract.ts "<file.pdf>" ["<file2.pdf>" ...] [--pages=1-5] [--verbose]
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { imageBoundsFromOps, selectTileBoxes, toPageFractions } from "../lib/pdf/geometry";
import { groupLines, suggestForBox, type TextItem } from "../lib/pdf/textHints";

async function main() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const files = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const verbose = process.argv.includes("--verbose");
  const range = process.argv.find((a) => a.startsWith("--pages="))?.slice(8);
  const [from, to] = range ? range.split("-").map(Number) : [1, Infinity];

  for (const file of files) {
    const data = new Uint8Array(readFileSync(file));
    const task = pdfjs.getDocument({ data, verbosity: 0 });
    const doc = await task.promise;
    let total = 0;
    let withCode = 0;
    let scanned = 0;
    console.log(`\n=== ${basename(file)} — ${doc.numPages} pages`);
    for (let n = Math.max(1, from); n <= Math.min(doc.numPages, to ?? doc.numPages); n++) {
      const page = await doc.getPage(n);
      const viewport = page.getViewport({ scale: 1 });
      const ops = await page.getOperatorList();
      const boxes = toPageFractions(imageBoundsFromOps(ops.fnArray, ops.argsArray, pdfjs.OPS), viewport);
      const tiles = selectTileBoxes(n, boxes);
      const content = await page.getTextContent();
      const items: TextItem[] = [];
      for (const raw of content.items) {
        if (!("str" in raw) || !raw.str.trim()) continue;
        const tx = pdfjs.Util.transform(viewport.transform, raw.transform);
        const h = Math.hypot(tx[2], tx[3]) || 1;
        items.push({ str: raw.str, x: tx[4] / viewport.width, y: (tx[5] - h) / viewport.height, w: raw.width / viewport.width, h: h / viewport.height });
      }
      const lines = groupLines(items);
      if (!lines.length) scanned++;
      total += tiles.length;
      const rows = tiles.map((t) => suggestForBox(t, lines, t.flags));
      withCode += rows.filter((r) => r.suggested.product_code).length;
      console.log(`p${n}: ${boxes.length} images -> ${tiles.length} candidates, ${lines.length} text lines`);
      if (verbose) {
        rows.forEach((r, i) =>
          console.log(
            `   #${i + 1} ${tiles[i].w.toFixed(2)}x${tiles[i].h.toFixed(2)}`,
            JSON.stringify(Object.fromEntries(Object.entries(r.suggested).filter(([, v]) => v))),
            r.warnings.join(","),
          ),
        );
        if (lines.length) console.log("   text:", lines.slice(0, 8).map((l) => l.text).join(" | "));
      }
    }
    console.log(`TOTAL ${total} candidates, ${withCode} with a code, ${scanned} pages without text`);
    await task.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
