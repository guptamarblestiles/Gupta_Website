/**
 * Converts a classified product's local images to WebP and pushes them to
 * Supabase (Storage + products/product_images rows). Deliberately does NOT
 * reuse lib/admin/products.ts's createProduct/addProductImage — those call
 * next/cache's revalidatePath, which throws outside a Next request context,
 * and the one-time bulk script (scripts/import/bulkImport.ts) runs as a
 * plain Node process via tsx, not inside Next. The /admin/import server
 * action calls revalidatePath itself after this returns.
 */
import { readFileSync } from "node:fs";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { toWebp } from "@/lib/admin/imageUpload";
import { STORAGE_BUCKET } from "@/lib/admin/imageConfig";
import type { ClassifiedProduct } from "./classify";

export type UploadResult =
  | { ok: true; slug: string }
  | { ok: false; slug: string; error: string };

export async function uploadClassifiedProduct(
  classification: ClassifiedProduct,
  imagePaths: string[],
): Promise<UploadResult> {
  const client = getSupabaseAdminClient();
  const { slug, productCode, name, category, finish, size, color, wallOrFloor, collection, description } =
    classification;

  const { data: product, error: insertError } = await client
    .from("products")
    .insert({
      slug,
      name,
      product_code: productCode,
      category: category || "Uncategorised",
      finish: finish || null,
      size: size || null,
      color: color || null,
      wall_or_floor: wallOrFloor || null,
      collection: collection || null,
      description: description || "",
    })
    .select("id")
    .single();

  if (insertError || !product) {
    return { ok: false, slug, error: insertError?.message ?? "insert failed" };
  }

  for (let i = 0; i < imagePaths.length; i++) {
    try {
      const buffer = readFileSync(imagePaths[i]);
      const webp = await toWebp(buffer);
      const path = `${slug}/image-${i}.webp`;

      const { error: uploadError } = await client.storage
        .from(STORAGE_BUCKET)
        .upload(path, webp, { contentType: "image/webp", upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrl } = client.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      const { error: imgError } = await client
        .from("product_images")
        .insert({ product_id: product.id, image_url: publicUrl.publicUrl, sort_order: i });
      if (imgError) throw imgError;
    } catch (err) {
      // Product row already exists; surface the image failure but don't
      // roll back the whole product over one bad file.
      return { ok: false, slug, error: `image ${i} failed: ${(err as Error).message}` };
    }
  }

  return { ok: true, slug };
}
