"use server";

/**
 * Converts uploaded product images to WebP and pushes them to Supabase
 * Storage under `tiles/{slug}/{timestamp}-{n}.webp`, then inserts the
 * corresponding product_images row. Shared by both the admin product form
 * (one-off edits) and the bulk import script (scripts/import), which is
 * why the WebP conversion / storage path logic lives here rather than
 * duplicated in each caller.
 */
import sharp from "sharp";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { addProductImage } from "@/lib/admin/products";
import { STORAGE_BUCKET, MAX_IMAGE_DIMENSION } from "@/lib/admin/imageConfig";

export async function toWebp(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize({ width: MAX_IMAGE_DIMENSION, height: MAX_IMAGE_DIMENSION, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
}

export async function uploadProductImages(productId: string, slug: string, formData: FormData) {
  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return;

  const client = getSupabaseAdminClient();
  const { count } = await client
    .from("product_images")
    .select("*", { count: "exact", head: true })
    .eq("product_id", productId);
  const existing = count ?? 0;
  if (existing + files.length > 5) {
    throw new Error(`This product would have ${existing + files.length} images; max is 5.`);
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const buffer = Buffer.from(await file.arrayBuffer());
    const webp = await toWebp(buffer);
    const path = `${slug}/${Date.now()}-${existing + i}.webp`;

    const { error: uploadError } = await client.storage
      .from(STORAGE_BUCKET)
      .upload(path, webp, { contentType: "image/webp", upsert: false });
    if (uploadError) throw uploadError;

    const { data: publicUrl } = client.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    await addProductImage(productId, publicUrl.publicUrl, existing + i);
  }
}
