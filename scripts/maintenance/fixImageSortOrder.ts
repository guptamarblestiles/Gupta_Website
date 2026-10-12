/**
 * One-off data fix: a chunk of imported products have a thin PDF-caption
 * crop (e.g. a "HEAVY DUTY" banner strip, ~1172x90px) stored as their
 * sort_order 0 image instead of the real tile photo, because the
 * extraction pipeline picked up every crop on the page as an "image" with
 * no filtering. The public site always shows sort_order 0 first, so these
 * products show a stretched, blank-looking banner instead of the tile.
 *
 * Detection: for products with >=2 images, read each image's actual
 * pixel dimensions (via sharp). A banner crop is extremely wide and
 * short (aspect ratio > BANNER_ASPECT); a real tile photo is ~square.
 * File size was tried first but is unreliable — a low-detail photo
 * (plain white marble, flat black/white checkerboard) can compress
 * smaller than the banner text crop, so size alone misses real cases.
 * Dimensions don't have that problem. If the current sort_order:0 image
 * is banner-shaped and another image in the set is square-ish, swap
 * their sort_order so the real photo becomes primary. Nothing is
 * deleted; the banner image just moves to the back of the gallery.
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
import sharp from "sharp";
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
const BANNER_ASPECT = 4; // width/height above this is a banner strip, not a tile photo
const SQUARE_ASPECT_MAX = 1.5; // width/height below this counts as "square enough" to be a real photo

type ImageRow = { id: string; image_url: string; sort_order: number };

async function aspectOf(url: string): Promise<number | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const meta = await sharp(buf).metadata();
    if (!meta.width || !meta.height) return null;
    return meta.width / meta.height;
  } catch {
    return null;
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
    bannerAspect: number;
    bannerOldOrder: number;
    photoId: string;
    photoAspect: number;
    photoOldOrder: number;
  }[] = [];

  const CONCURRENCY = 10;
  let idx = 0;
  async function worker() {
    while (idx < products.length) {
      const p = products[idx++];
      const imgs = (p.product_images ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
      if (imgs.length < 2) continue;

      const primary = imgs[0];
      const primaryAspect = await aspectOf(primary.image_url);
      if (primaryAspect === null || primaryAspect < BANNER_ASPECT) continue;

      let candidate: ImageRow | null = null;
      let candidateAspect = 0;
      for (let i = 1; i < imgs.length; i++) {
        const aspect = await aspectOf(imgs[i].image_url);
        if (aspect !== null && aspect <= SQUARE_ASPECT_MAX) {
          candidate = imgs[i];
          candidateAspect = aspect;
          break;
        }
      }
      if (!candidate) continue;

      swaps.push({
        slug: p.slug,
        bannerId: primary.id,
        bannerAspect: primaryAspect,
        bannerOldOrder: primary.sort_order,
        photoId: candidate.id,
        photoAspect: candidateAspect,
        photoOldOrder: candidate.sort_order,
      });
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(`Checked ${products.length} products. Found ${swaps.length} to fix.\n`);
  for (const s of swaps) {
    console.log(
      `${s.slug}: sort_order ${s.bannerOldOrder} (${s.bannerAspect.toFixed(1)}:1 banner) <-> ${s.photoOldOrder} (${s.photoAspect.toFixed(2)}:1 photo)`,
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
