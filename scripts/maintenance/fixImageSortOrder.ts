/**
 * One-off data fix: a chunk of imported products have a thin PDF-caption
 * crop (e.g. a "HEAVY DUTY" banner strip) stored as their sort_order 0
 * image instead of the real tile photo, because the extraction pipeline
 * picked up every crop on the page as an "image" with no size/content
 * filtering. The public site always shows sort_order 0 first, so these
 * products show a stretched, blank-looking banner instead of the tile.
 *
 * Detection heuristic: for products with >=2 images, HEAD each image URL.
 * If the current sort_order:0 image is both under 10KB AND less than a
 * third the size of the largest image in the set, it's almost certainly a
 * caption/banner crop, not a photo — swap sort_order with the largest
 * image so the real photo becomes primary. Nothing is deleted; the banner
 * image just moves to the back of the gallery instead of the front.
 *
 * SAFE BY DEFAULT: dry run, writes nothing. Pass --apply to write.
 * Needs .env.local: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY.
 *
 * Usage:
 *   npx tsx scripts/maintenance/fixImageSortOrder.ts            # dry run
 *   npx tsx scripts/maintenance/fixImageSortOrder.ts --apply    # write
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getSupabaseAdminClient } from "../../lib/supabase/admin";

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

const APPLY = process.argv.includes("--apply");
const MIN_BANNER_BYTES = 10_000;
const MIN_RATIO = 3; // real photo must be at least 3x the suspect image's size

type ImageRow = { id: string; image_url: string; sort_order: number };

async function sizeOf(url: string): Promise<number> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return parseInt(res.headers.get("content-length") ?? "0", 10);
  } catch {
    return 0;
  }
}

async function main() {
  const client = getSupabaseAdminClient();
  const { data, error } = await client
    .from("products")
    .select("id, name, slug, product_images(id, image_url, sort_order)");
  if (error) throw error;

  const products = (data ?? []) as {
    id: string;
    name: string;
    slug: string;
    product_images: ImageRow[];
  }[];

  const swaps: {
    slug: string;
    bannerId: string;
    bannerBytes: number;
    bannerOldOrder: number;
    photoId: string;
    photoBytes: number;
    photoOldOrder: number;
  }[] = [];

  const CONCURRENCY = 20;
  let idx = 0;
  async function worker() {
    while (idx < products.length) {
      const p = products[idx++];
      const imgs = (p.product_images ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
      if (imgs.length < 2) continue;

      const sizes = await Promise.all(imgs.map((img) => sizeOf(img.image_url)));
      const primary = imgs[0];
      const primarySize = sizes[0];
      if (primarySize === 0 || primarySize >= MIN_BANNER_BYTES) continue;

      let bestIdx = -1;
      let bestSize = 0;
      for (let i = 1; i < imgs.length; i++) {
        if (sizes[i] > bestSize) {
          bestSize = sizes[i];
          bestIdx = i;
        }
      }
      if (bestIdx === -1 || bestSize < primarySize * MIN_RATIO) continue;

      const photo = imgs[bestIdx];
      swaps.push({
        slug: p.slug,
        bannerId: primary.id,
        bannerBytes: primarySize,
        bannerOldOrder: primary.sort_order,
        photoId: photo.id,
        photoBytes: bestSize,
        photoOldOrder: photo.sort_order,
      });
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(`Checked ${products.length} products. Found ${swaps.length} to fix.\n`);
  for (const s of swaps) {
    console.log(
      `${s.slug}: sort_order ${s.bannerOldOrder} (${s.bannerBytes}B banner) <-> ${s.photoOldOrder} (${s.photoBytes}B photo)`,
    );
  }

  if (!APPLY) {
    console.log("\nDry run only — pass --apply to write these swaps.");
    return;
  }

  console.log("\nApplying...");
  for (const s of swaps) {
    const { error: e1 } = await client
      .from("product_images")
      .update({ sort_order: s.photoOldOrder })
      .eq("id", s.bannerId);
    const { error: e2 } = await client
      .from("product_images")
      .update({ sort_order: s.bannerOldOrder })
      .eq("id", s.photoId);
    if (e1 || e2) console.error(`FAILED ${s.slug}:`, e1 ?? e2);
  }
  console.log(`Done. Updated ${swaps.length} products.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
