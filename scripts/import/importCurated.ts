/**
 * Idempotent import of the curated, APPROVED products from the PDF
 * curation workflow (manifest.json + images/ produced by the extraction
 * scripts).
 *
 * SAFE BY DEFAULT: runs as a dry run and writes nothing. Pass --apply to
 * write. Re-running is safe: products are upserted by slug, their images
 * are replaced (not duplicated), and nothing is ever deleted from the
 * existing catalogue. A manifest product whose product_code already belongs
 * to a DIFFERENT existing slug is reported as a conflict and skipped.
 *
 * Requires the 20261011160000 migration to be applied first.
 *
 * Usage:
 *   npx tsx scripts/import/importCurated.ts "/abs/path/to/curated"           # dry run
 *   npx tsx scripts/import/importCurated.ts "/abs/path/to/curated" --apply   # write
 *
 * Source PDFs are registered in `source_pdfs` with file_url left null (the
 * product page then shows "unavailable"); upload the PDFs and set file_url
 * separately — some exceed the 50 MB storage limit.
 * Needs .env.local: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY.
 */
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { getSupabaseAdminClient } from "../../lib/supabase/admin";
import { STORAGE_BUCKET } from "../../lib/admin/imageConfig";

type ManifestProduct = {
  id: string;
  slug: string;
  name: string;
  product_code: string | null;
  size_normalized: string | null;
  finish: string | null;
  finish_detail: string | null;
  application: string | null;
  series: string | null;
  thickness: string | null;
  material: string | null;
  faces: number | null;
  pattern: string | null;
  colour: string | null;
  source_pdf: string;
  source_page: number;
  source_title: string;
  status: string;
  images: { main: string; lifestyle?: string; layout?: string; tiles?: string[] };
};

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

const slugify = (s: string) =>
  s.toLowerCase().replace(/\.pdf$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Printed code if the PDF has one, else the printed design name. */
function baseCode(p: ManifestProduct): string {
  return (p.product_code ?? p.name).trim();
}

function roomsFor(p: ManifestProduct): string[] {
  // Only what the PDF itself states: a "Kitchen Series" label.
  return p.series?.toLowerCase().includes("kitchen") ? ["Kitchen"] : [];
}

function categoryFor(p: ManifestProduct): string {
  if (p.material) return p.material.replace(/\b\w/g, (c) => c.toUpperCase());
  if (p.application === "Wall") return "Wall Tiles";
  return "Tiles";
}

function imageList(p: ManifestProduct): string[] {
  const { main, lifestyle, layout, tiles } = p.images;
  return [main, lifestyle, layout, ...(tiles ?? [])].filter((x): x is string => Boolean(x));
}

async function main() {
  const dir = process.argv[2];
  const apply = process.argv.includes("--apply");
  if (!dir) {
    console.error('Usage: npx tsx scripts/import/importCurated.ts "<curated dir>" [--apply]');
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf-8"));
  const all: ManifestProduct[] = Array.isArray(raw) ? raw : raw.products;
  const approved = all.filter((p) => p.status === "approved");
  console.log(`${apply ? "APPLY" : "DRY RUN"}: ${approved.length} approved of ${all.length} in manifest`);

  // Unique product_code within the batch: repeat codes get a page suffix.
  const seen = new Map<string, number>();
  for (const p of approved) seen.set(baseCode(p), (seen.get(baseCode(p)) ?? 0) + 1);
  const codeOf = (p: ManifestProduct) =>
    seen.get(baseCode(p))! > 1 ? `${baseCode(p)}-P${p.source_page}` : baseCode(p);

  const client = getSupabaseAdminClient();
  const { data: existing, error: existingError } = await client
    .from("products")
    .select("slug, product_code")
    .range(0, 9999);
  if (existingError) throw existingError;
  const slugByCode = new Map((existing ?? []).map((r) => [r.product_code as string, r.slug as string]));

  const conflicts: string[] = [];
  const toWrite = approved.filter((p) => {
    const owner = slugByCode.get(codeOf(p));
    if (owner && owner !== p.slug) {
      conflicts.push(`${p.slug}: code "${codeOf(p)}" already used by existing "${owner}"`);
      return false;
    }
    const missing = imageList(p).filter((f) => !existsSync(join(dir, f)));
    if (missing.length) {
      conflicts.push(`${p.slug}: missing image files ${missing.join(", ")}`);
      return false;
    }
    return true;
  });

  console.log(`${toWrite.length} importable, ${conflicts.length} skipped`);
  conflicts.forEach((c) => console.log("  SKIP", c));
  if (!apply) {
    console.log("Dry run only — nothing written. Re-run with --apply.");
    return;
  }

  // Register source PDFs (file_url intentionally untouched).
  const pdfNames = [...new Set(toWrite.map((p) => p.source_pdf))];
  const { error: pdfError } = await client.from("source_pdfs").upsert(
    pdfNames.map((name) => ({
      slug: slugify(name),
      title: toWrite.find((p) => p.source_pdf === name)!.source_title,
      original_filename: name,
    })),
    { onConflict: "original_filename", ignoreDuplicates: true },
  );
  if (pdfError) throw pdfError;
  const { data: pdfRows, error: pdfReadError } = await client
    .from("source_pdfs")
    .select("id, original_filename")
    .in("original_filename", pdfNames);
  if (pdfReadError) throw pdfReadError;
  const pdfId = new Map((pdfRows ?? []).map((r) => [r.original_filename as string, r.id as string]));

  let ok = 0;
  for (const p of toWrite) {
    try {
      const { data: row, error } = await client
        .from("products")
        .upsert(
          {
            slug: p.slug,
            name: p.name,
            product_code: codeOf(p),
            category: categoryFor(p),
            finish: p.finish,
            finish_detail: p.finish_detail,
            size: p.size_normalized,
            color: p.colour,
            wall_or_floor: p.application,
            application: p.application,
            rooms: roomsFor(p),
            pattern: p.pattern,
            thickness: p.thickness,
            material: p.material,
            series: p.series,
            faces: p.faces,
            source_pdf_id: pdfId.get(p.source_pdf) ?? null,
            source_page: p.source_page,
            review_status: "keep",
            is_visible: true,
            description: "",
          },
          { onConflict: "slug" },
        )
        .select("id")
        .single();
      if (error || !row) throw error ?? new Error("no row returned");

      // Replace images so re-runs never duplicate.
      await client.from("product_images").delete().eq("product_id", row.id);
      const files = imageList(p);
      for (let i = 0; i < files.length; i++) {
        const path = `${p.slug}/image-${i}-${basename(files[i])}`;
        const { error: upError } = await client.storage
          .from(STORAGE_BUCKET)
          .upload(path, readFileSync(join(dir, files[i])), { contentType: "image/webp", upsert: true });
        if (upError) throw upError;
        const { data: url } = client.storage.from(STORAGE_BUCKET).getPublicUrl(path);
        const { error: imgError } = await client
          .from("product_images")
          .insert({ product_id: row.id, image_url: url.publicUrl, sort_order: i });
        if (imgError) throw imgError;
      }
      ok++;
      console.log("  ok", p.slug);
    } catch (err) {
      console.error("  FAIL", p.slug, (err as Error).message);
    }
  }
  console.log(`Done: ${ok}/${toWrite.length} written.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
