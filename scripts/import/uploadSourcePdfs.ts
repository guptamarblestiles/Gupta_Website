/**
 * Uploads the source catalogue PDFs to Supabase Storage (public bucket
 * "catalogues", folder source-pdfs/) and links them to their `source_pdfs`
 * rows so product pages can show View / Download.
 *
 * Supabase's free plan caps uploads at 50 MB. For any PDF at or over that
 * size, a lighter copy is used from <dir>/web_optimized/ (same file name,
 * same pages) if it exists; otherwise the file is skipped and reported.
 * Originals are never modified.
 *
 * SAFE BY DEFAULT: dry run unless --apply. Re-running overwrites the same
 * storage path (upsert) and the same row — no duplicates.
 *
 * Usage:
 *   npx tsx scripts/import/uploadSourcePdfs.ts "<folder with the PDFs>"          # dry run
 *   npx tsx scripts/import/uploadSourcePdfs.ts "<folder with the PDFs>" --apply
 * Needs .env.local: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { getSupabaseAdminClient } from "../../lib/supabase/admin";

const BUCKET = "catalogues";
const FOLDER = "source-pdfs";
const LIMIT_BYTES = 49 * 1024 * 1024;

function loadEnvLocal() {
  try {
    for (const line of readFileSync(join(process.cwd(), ".env.local"), "utf-8").split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^(["'])(.*)\1$/, "$2");
    }
  } catch {
    /* env may already be set */
  }
}
loadEnvLocal();

async function main() {
  const dir = process.argv[2];
  const apply = process.argv.includes("--apply");
  if (!dir) {
    console.error('Usage: npx tsx scripts/import/uploadSourcePdfs.ts "<pdf folder>" [--apply]');
    process.exit(1);
  }

  const client = getSupabaseAdminClient();
  const { data: rows, error } = await client
    .from("source_pdfs")
    .select("id, slug, original_filename");
  if (error) throw error;

  console.log(`${apply ? "APPLY" : "DRY RUN"}: ${rows?.length ?? 0} source PDFs registered`);

  for (const row of rows ?? []) {
    const original = join(dir, row.original_filename);
    const light = join(dir, "web_optimized", row.original_filename);
    let file = original;
    let note = "original";

    if (!existsSync(original)) {
      console.log(`  SKIP ${row.original_filename}: file not found in ${dir}`);
      continue;
    }
    if (statSync(original).size > LIMIT_BYTES) {
      if (existsSync(light) && statSync(light).size <= LIMIT_BYTES) {
        file = light;
        note = "lighter copy (original over 50 MB)";
      } else {
        console.log(`  SKIP ${row.original_filename}: over 50 MB and no usable web_optimized copy`);
        continue;
      }
    }

    const size = statSync(file).size;
    const path = `${FOLDER}/${row.slug}.pdf`;
    console.log(`  ${apply ? "UPLOAD" : "WOULD UPLOAD"} ${row.original_filename} -> ${path} (${(size / 1048576).toFixed(1)} MB, ${note})`);
    if (!apply) continue;

    const { error: upError } = await client.storage
      .from(BUCKET)
      .upload(path, readFileSync(file), { contentType: "application/pdf", upsert: true });
    if (upError) {
      console.error("    FAIL upload:", upError.message);
      continue;
    }
    const { data: url } = client.storage.from(BUCKET).getPublicUrl(path);
    const { error: updError } = await client
      .from("source_pdfs")
      .update({ file_url: url.publicUrl, file_size_bytes: size })
      .eq("id", row.id);
    if (updError) console.error("    FAIL link:", updError.message);
    else console.log("    ok");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
