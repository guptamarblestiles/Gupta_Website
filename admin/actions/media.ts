"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/lib/run";
import { fail, type ActionResult } from "@/lib/actionResult";
import { listMedia, mediaUsage, type MediaObject } from "@/lib/data/media";
import { IMAGE_BUCKET, PDF_BUCKET, storagePathFromUrl } from "@/lib/env";
import { refreshPublicSite } from "@/lib/publicSite";

export async function browseMedia(q: string, page: number, unused = false): Promise<ActionResult<{ items: MediaObject[]; total: number }>> {
  return runAction("viewer", async () => {
    const res = await listMedia({ bucket: IMAGE_BUCKET, q, page, unused, pageSize: 30 });
    return { ok: true, message: "", data: { items: res.items, total: res.total } };
  });
}

export async function getMediaUsage(url: string) {
  return runAction("viewer", async () => ({ ok: true, message: "", data: await mediaUsage(url) }));
}

/** Append an existing library image to a product's gallery. */
export async function addImageToProduct(productId: string, url: string): Promise<ActionResult> {
  return runAction("editor", async ({ db }) => {
    const { data: imgs, error } = await db.from("product_images").select("image_url, sort_order").eq("product_id", productId).order("sort_order");
    if (error) throw error;
    const urls = (imgs ?? []).map((r) => r.image_url as string);
    if (urls.includes(url)) return fail("That product already uses this image.");
    const { error: setErr } = await db.rpc("admin_set_product_images", { p_product_id: productId, p_image_urls: [...urls, url] });
    if (setErr) throw setErr;
    const { data: p } = await db.from("products").select("status, name").eq("id", productId).single();
    revalidatePath("/media");
    revalidatePath(`/products/${productId}`);
    return {
      ok: true,
      message: `Added to “${p?.name ?? "product"}”.`,
      publicSync: p?.status === "published" ? await refreshPublicSite() : "not_needed",
    };
  });
}

/**
 * Permanently delete a stored file. Owners only (Storage RLS agrees), and
 * only when NOTHING references it — re-checked here at delete time, not
 * trusted from the list the user was looking at.
 */
export async function deleteMediaObject(url: string): Promise<ActionResult> {
  return runAction("owner", async ({ db }) => {
    const loc = storagePathFromUrl(url);
    if (!loc || ![IMAGE_BUCKET, PDF_BUCKET].includes(loc.bucket)) return fail("That file isn't in the website's storage.");
    const { data, error } = await db.rpc("admin_media_objects", {
      p_bucket: loc.bucket,
      p_search: loc.path,
      p_unused_only: false,
      p_limit: 50,
      p_offset: 0,
    });
    if (error) throw error;
    const row = ((data ?? []) as { name: string; product_refs: number; other_refs: number }[]).find((r) => r.name === loc.path);
    if (!row) return fail("That file no longer exists.");
    const refs = Number(row.product_refs) + Number(row.other_refs);
    if (refs > 0) return fail(`This file is still used in ${refs} place${refs === 1 ? "" : "s"}, so it was not deleted.`);
    const { error: rmError } = await db.storage.from(loc.bucket).remove([loc.path]);
    if (rmError) throw rmError;
    revalidatePath("/media");
    return { ok: true, message: "File deleted." };
  });
}
