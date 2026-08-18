/**
 * Requires a public Supabase Storage bucket named "catalogues" (Storage >
 * New bucket > Public bucket) — same manual one-time setup step as the
 * existing "tiles" bucket (lib/admin/imageConfig.ts), not created by any
 * migration since Storage buckets aren't part of the SQL schema.
 */
export const CATALOGUE_STORAGE_BUCKET = "catalogues";
export const MAX_PDF_BYTES = 50 * 1024 * 1024; // 50MB
