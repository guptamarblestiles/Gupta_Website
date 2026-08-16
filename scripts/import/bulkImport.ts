/**
 * One-time bulk import for the initial FINAL_FINAL image batch (Part 2 step
 * 5): scans a local folder, classifies every product, uploads images +
 * inserts rows directly — no clicking through /admin/import hundreds of
 * times. The admin UI at /admin/import exists separately for one-off future
 * additions; this script is only for the big first load.
 *
 * Usage: npx tsx scripts/import/bulkImport.ts "/absolute/path/to/folder" [--dry-run]
 * Requires .env.local to hold NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { scanImportFolder } from "../../lib/import/scanFolder";
import { uploadClassifiedProduct } from "../../lib/import/uploadProduct";

/** No dotenv dependency for one script — .env.local is simple KEY=VALUE lines. */
function loadEnvLocal() {
  const path = join(process.cwd(), ".env.local");
  let text: string;
  try {
    text = readFileSync(path, "utf-8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

loadEnvLocal();

async function main() {
  const rootPath = process.argv[2];
  const dryRun = process.argv.includes("--dry-run");

  if (!rootPath) {
    console.error("Usage: npx tsx scripts/import/bulkImport.ts <folder-path> [--dry-run]");
    process.exit(1);
  }

  const products = scanImportFolder(rootPath);
  console.log(`Scanned ${products.length} products from ${rootPath}`);

  // product_code and slug both have unique constraints; dedupe by
  // prefixing the category slug on any collision (a plain numeric code
  // like "415" can plausibly recur across two different catalogue folders).
  const seenCodes = new Set<string>();
  const seenSlugs = new Set<string>();
  for (const p of products) {
    const { classification } = p;
    if (seenCodes.has(classification.productCode)) {
      classification.productCode = `${classification.slug}`;
    }
    seenCodes.add(classification.productCode);

    let slug = classification.slug;
    let n = 2;
    while (seenSlugs.has(slug)) slug = `${classification.slug}-${n++}`;
    classification.slug = slug;
    seenSlugs.add(slug);
  }

  if (dryRun) {
    for (const p of products) {
      console.log(JSON.stringify(p.classification, null, 2));
    }
    console.log(`Dry run: ${products.length} products, would not write to Supabase.`);
    return;
  }

  let ok = 0;
  let failed = 0;
  for (const [i, p] of products.entries()) {
    const result = await uploadClassifiedProduct(p.classification, p.imagePaths);
    if (result.ok) {
      ok++;
      console.log(`[${i + 1}/${products.length}] OK  ${result.slug}`);
    } else {
      failed++;
      console.error(`[${i + 1}/${products.length}] FAIL ${result.slug}: ${result.error}`);
    }
  }

  console.log(`Done: ${ok} uploaded, ${failed} failed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
