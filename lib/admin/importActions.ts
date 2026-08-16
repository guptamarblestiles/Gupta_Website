"use server";

/**
 * Server actions for /admin/import: scan a local folder path (server-side
 * fs read — the admin panel and the image folder are assumed to be on the
 * same machine, per the brief) and upload confirmed products one at a time.
 * Classification logic lives in lib/import/*; this file just wires it to
 * Next's server action / revalidation layer, which scripts/import's
 * standalone bulk script can't depend on (see lib/import/uploadProduct.ts).
 */
import { revalidatePath } from "next/cache";
import { scanImportFolder, type ScannedProduct } from "@/lib/import/scanFolder";
import { uploadClassifiedProduct, type UploadResult } from "@/lib/import/uploadProduct";
import type { ClassifiedProduct } from "@/lib/import/classify";

export type ScanResult = { ok: true; products: ScannedProduct[] } | { ok: false; error: string };

export async function scanImportFolderAction(rootPath: string): Promise<ScanResult> {
  try {
    const products = scanImportFolder(rootPath.trim());
    return { ok: true, products };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not read that folder." };
  }
}

export async function uploadImportedProductAction(
  classification: ClassifiedProduct,
  imagePaths: string[],
): Promise<UploadResult> {
  const result = await uploadClassifiedProduct(classification, imagePaths);
  if (result.ok) {
    revalidatePath("/admin");
    revalidatePath("/products");
  }
  return result;
}
