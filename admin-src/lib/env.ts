/** Public (browser-safe) configuration. Server-only secrets are read where
 *  they are used (lib/supabase/service.ts, lib/publicSite.ts) so they can
 *  never be pulled into a client bundle through this module. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
export const ADMIN_URL = (process.env.NEXT_PUBLIC_ADMIN_URL ?? "").replace(/\/$/, "");
export const MAX_PDF_MB = Number(process.env.NEXT_PUBLIC_MAX_PDF_MB) || 50;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

/** Existing public buckets (see the public site's lib/admin/imageConfig.ts
 *  and lib/admin/catalogueConfig.ts). The admin app adds no new buckets. */
export const IMAGE_BUCKET = "tiles";
export const PDF_BUCKET = "catalogues";
export const SOURCE_PDF_FOLDER = "source-pdfs";

export function publicStorageUrl(bucket: string, path: string): string {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encoded}`;
}

/** Inverse of publicStorageUrl for our own buckets; null for any other URL. */
export function storagePathFromUrl(url: string): { bucket: string; path: string } | null {
  const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+?)(?:\?.*)?$/);
  if (!match) return null;
  return { bucket: match[1], path: decodeURIComponent(match[2]) };
}
