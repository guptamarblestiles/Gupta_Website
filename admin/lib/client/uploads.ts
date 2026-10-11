"use client";

import { getBrowserClient } from "@/lib/supabase/browser";
import { IMAGE_BUCKET, publicStorageUrl } from "@/lib/env";
import { extensionFor, prepareImage } from "@/lib/client/files";

/**
 * Upload one product/library image straight from the browser to the public
 * "tiles" bucket. The object name is derived from the image's content hash,
 * so uploading the same picture twice reuses the existing file instead of
 * storing a duplicate. Storage RLS only lets owners/editors write.
 */
export async function uploadImage(file: File, folder: string): Promise<{ url: string; path: string; reused: boolean }> {
  const { blob, hash } = await prepareImage(file);
  const path = `${folder.replace(/^\/+|\/+$/g, "")}/${hash.slice(0, 24)}.${extensionFor(blob)}`;
  const supabase = getBrowserClient();
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, blob, {
    contentType: blob.type,
    upsert: false,
    cacheControl: "31536000",
  });
  let reused = false;
  if (error) {
    if (/exists|duplicate/i.test(error.message)) reused = true;
    else if (/row-level security|unauthori[sz]ed|403/i.test(error.message)) throw new Error("Your account can't upload files.");
    else throw new Error(`Upload failed: ${error.message}`);
  }
  return { url: publicStorageUrl(IMAGE_BUCKET, path), path, reused };
}

export async function uploadBlob(blob: Blob, path: string): Promise<string> {
  const supabase = getBrowserClient();
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, blob, {
    contentType: blob.type,
    upsert: true,
    cacheControl: "3600",
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return publicStorageUrl(IMAGE_BUCKET, path);
}
