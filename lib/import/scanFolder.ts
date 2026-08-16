/**
 * Walks a local two-level image folder (category folder > product folder >
 * image-N.jpg) and returns one ClassifiedProduct + absolute image paths per
 * product folder found. Server-only (node:fs) — used by both the one-time
 * bulk import script and the /admin/import review UI's "scan" action.
 *
 * Also opportunistically parses each category folder's EXTRACTION_SUMMARY.txt
 * or PRODUCT_LIST.txt (a byproduct of whatever PDF-extraction tool produced
 * this folder — not something this app writes) for a per-product description
 * line, since those are far more reliable than filename guessing when
 * present. Folders without one of those files just fall back to filename-
 * only classification.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { classifyProduct, type ClassifiedProduct } from "./classify";

export type ScannedProduct = {
  classification: ClassifiedProduct;
  imagePaths: string[];
};

const SUMMARY_FILENAMES = ["EXTRACTION_SUMMARY.txt", "PRODUCT_LIST.txt"];
const IGNORED_ENTRIES = new Set([".DS_Store", "COMBINED_SUMMARY.txt"]);

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/** Product name -> description, parsed from whichever summary file exists
 *  in a category folder. Best-effort: returns {} if neither file is there
 *  or the format doesn't match what's parsed below. */
function parseDescriptions(categoryPath: string): Record<string, string> {
  const descriptions: Record<string, string> = {};

  for (const filename of SUMMARY_FILENAMES) {
    const path = join(/*turbopackIgnore: true*/ categoryPath, filename);
    if (!isDirectory(categoryPath) || !fileExists(path)) continue;
    const text = readFileSync(path, "utf-8");

    if (filename === "PRODUCT_LIST.txt") {
      // Pipe-delimited table; column order/count isn't consistent across
      // catalogues (some have a "Layout" column, some don't), so find the
      // Notes column by header rather than assuming its index.
      const lines = text.split("\n").filter(Boolean);
      const header = lines[0]?.split("|").map((c) => c.trim().toLowerCase()) ?? [];
      const notesIdx = header.indexOf("notes");
      if (notesIdx === -1) continue;

      for (const line of lines.slice(1)) {
        const cols = line.split("|").map((c) => c.trim());
        // Never overwrite a description already captured from
        // EXTRACTION_SUMMARY.txt — its Description field is consistently
        // fuller (includes size) than this table's shorter Notes column.
        if (cols[0] && cols[notesIdx] && !descriptions[cols[0]]) {
          descriptions[cols[0]] = cols[notesIdx];
        }
      }
    } else {
      // "Product: X\n  ...\n  Description: Y" blocks
      const blocks = text.split(/\nProduct:\s*/).slice(1);
      for (const block of blocks) {
        const name = block.split("\n")[0].trim();
        const descMatch = block.match(/Description:\s*(.+)/);
        if (name && descMatch) descriptions[name] = descMatch[1].trim();
      }
    }
  }

  return descriptions;
}

function fileExists(path: string): boolean {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

export function scanImportFolder(rootPath: string): ScannedProduct[] {
  const results: ScannedProduct[] = [];

  const categoryEntries = readdirSync(rootPath).filter(
    (e) => !IGNORED_ENTRIES.has(e) && isDirectory(join(/*turbopackIgnore: true*/ rootPath, e)),
  );

  for (const categoryFolder of categoryEntries) {
    const categoryPath = join(/*turbopackIgnore: true*/ rootPath, categoryFolder);
    const descriptions = parseDescriptions(categoryPath);

    const productEntries = readdirSync(categoryPath).filter(
      (e) => !IGNORED_ENTRIES.has(e) && !SUMMARY_FILENAMES.includes(e) && isDirectory(join(/*turbopackIgnore: true*/ categoryPath, e)),
    );

    for (const productFolder of productEntries) {
      const productPath = join(/*turbopackIgnore: true*/ categoryPath, productFolder);
      const imagePaths = readdirSync(productPath)
        .filter((f) => /^image-\d+\.(jpg|jpeg|png|webp)$/i.test(f))
        .sort()
        .slice(0, 5)
        .map((f) => join(/*turbopackIgnore: true*/ productPath, f));

      if (imagePaths.length === 0) continue;

      results.push({
        classification: classifyProduct(categoryFolder, productFolder, descriptions[productFolder] ?? ""),
        imagePaths,
      });
    }
  }

  return results;
}
