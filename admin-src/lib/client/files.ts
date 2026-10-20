"use client";

import { canvasToImage } from "@admin/lib/client/pdf";

export async function sha256Hex(data: ArrayBuffer | Blob): Promise<string> {
  const buf = data instanceof Blob ? await data.arrayBuffer() : data;
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function extensionFor(blob: Blob): "webp" | "jpg" {
  return blob.type === "image/webp" ? "webp" : "jpg";
}

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_INPUT_BYTES = 25 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1600; // same cap as the public site's sharp pipeline

/** Validate, auto-rotate, downscale to ≤1600px and re-encode a photo in the
 *  browser — the same treatment lib/admin/imageUpload.ts gives on the public
 *  site, but without sending the original through a server function. */
export async function prepareImage(file: File): Promise<{ blob: Blob; width: number; height: number; hash: string }> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(`"${file.name}" isn't a JPG, PNG or WebP image.`);
  }
  if (file.size > MAX_IMAGE_INPUT_BYTES) {
    throw new Error(`"${file.name}" is larger than 25 MB.`);
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(`"${file.name}" couldn't be opened as an image. It may be damaged.`);
  }
  const ratio = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * ratio);
  const height = Math.round(bitmap.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await canvasToImage(canvas);
  return { blob, width, height, hash: await sha256Hex(blob) };
}

/** True when bytes start with "%PDF-". Catches renamed non-PDF files. */
export async function looksLikePdf(file: File): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  return String.fromCharCode(...head) === "%PDF-";
}

/**
 * PUT a file to a Supabase signed upload URL with progress events (the
 * supabase-js helper doesn't expose progress, which matters for a 40 MB
 * PDF on a phone connection).
 */
export function uploadWithProgress(
  signedUrl: string,
  file: Blob,
  contentType: string,
  onProgress: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("content-type", contentType);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", "max-age=3600");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      // 409 = the object already exists. Paths are content-addressed, so it
      // is this same file from an earlier, interrupted attempt.
      if (xhr.status === 409 || /already exists|Duplicate/i.test(xhr.responseText)) return resolve();
      reject(new Error(`Upload failed (${xhr.status}). ${xhr.status === 413 ? "The file is too large for storage." : "Please try again."}`));
    };
    xhr.onerror = () => reject(new Error("Upload interrupted. Check your connection and press Retry."));
    xhr.send(file);
  });
}
