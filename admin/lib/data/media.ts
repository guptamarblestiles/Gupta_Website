import "server-only";
import { createClient } from "@/lib/supabase/server";
import { IMAGE_BUCKET, PDF_BUCKET, publicStorageUrl } from "@/lib/env";

export type MediaObject = {
  name: string;
  url: string;
  size_bytes: number | null;
  mime_type: string | null;
  created_at: string;
  product_refs: number;
  published_refs: number;
  other_refs: number;
};

export const MEDIA_PAGE_SIZE = 48;

export async function listMedia(opts: { bucket?: string; q?: string; unused?: boolean; page?: number; pageSize?: number }) {
  const bucket = opts.bucket === PDF_BUCKET ? PDF_BUCKET : IMAGE_BUCKET;
  const pageSize = opts.pageSize ?? MEDIA_PAGE_SIZE;
  const page = Math.max(1, opts.page ?? 1);
  const db = await createClient();
  const { data, error } = await db.rpc("admin_media_objects", {
    p_bucket: bucket,
    p_search: opts.q?.trim() || null,
    p_unused_only: Boolean(opts.unused),
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize,
  });
  if (error) throw error;
  type Row = Omit<MediaObject, "url" | "product_refs" | "published_refs" | "other_refs"> & {
    product_refs: number | string;
    published_refs: number | string;
    other_refs: number | string;
    total_count: number | string;
  };
  const rows = (data ?? []) as Row[];
  return {
    bucket,
    page,
    pageSize,
    total: rows.length ? Number(rows[0].total_count) : 0,
    items: rows.map<MediaObject>((r) => ({
      name: r.name,
      url: publicStorageUrl(bucket, r.name),
      size_bytes: r.size_bytes,
      mime_type: r.mime_type,
      created_at: r.created_at,
      product_refs: Number(r.product_refs),
      published_refs: Number(r.published_refs),
      other_refs: Number(r.other_refs),
    })),
  };
}

/** Products that use a given public image URL. */
export async function mediaUsage(url: string) {
  const db = await createClient();
  const path = url.split("/storage/v1/object/public/")[1] ?? url;
  const { data, error } = await db
    .from("product_images")
    .select("product_id, sort_order, products(id, name, product_code, status)")
    .like("image_url", `%${path.replace(/[%_\\]/g, "\\$&")}`)
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((r) => {
    const p = r.products as unknown as { id: string; name: string; product_code: string; status: string };
    return { ...p, primary: r.sort_order === 0 };
  });
}

export async function brokenProductImages() {
  const db = await createClient();
  const { data, error } = await db.rpc("admin_broken_product_images");
  if (error) throw error;
  return (data ?? []) as { image_id: string; product_id: string; product_name: string; product_status: string; image_url: string }[];
}
