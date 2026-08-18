"use server";

/** Admin CRUD for PDF catalogues/lookbooks. PDFs go to the "catalogues"
 *  Supabase Storage bucket (public read, admin-only write — see the
 *  bucket-creation note in supabase/migrations/…add_pricing_categories…
 *  for why it's a separate bucket from the "tiles" image bucket: totally
 *  different content-type / size profile). */
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { CATALOGUE_STORAGE_BUCKET, MAX_PDF_BYTES } from "@/lib/admin/catalogueConfig";

export type AdminCatalogueRow = {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  pdf_url: string;
  pdf_size_bytes: number | null;
  thumbnail_url: string | null;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export async function listCatalogues(): Promise<AdminCatalogueRow[]> {
  const client = getSupabaseAdminClient();
  const { data, error } = await client
    .from("catalogues")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getCatalogueForEdit(id: string): Promise<AdminCatalogueRow> {
  const client = getSupabaseAdminClient();
  const { data, error } = await client.from("catalogues").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export type CatalogueInput = {
  title: string;
  description?: string | null;
  category_id?: string | null;
  is_visible: boolean;
  sort_order: number;
};

async function uploadPdf(file: File): Promise<{ pdf_url: string; pdf_size_bytes: number }> {
  if (file.type !== "application/pdf") {
    throw new Error("Catalogue file must be a PDF.");
  }
  if (file.size > MAX_PDF_BYTES) {
    throw new Error(`PDF is too large (${Math.round(file.size / 1024 / 1024)}MB) — max 50MB.`);
  }

  const client = getSupabaseAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());
  const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;

  const { error } = await client.storage
    .from(CATALOGUE_STORAGE_BUCKET)
    .upload(path, buffer, { contentType: "application/pdf", upsert: false });
  if (error) throw error;

  const { data } = client.storage.from(CATALOGUE_STORAGE_BUCKET).getPublicUrl(path);
  return { pdf_url: data.publicUrl, pdf_size_bytes: file.size };
}

export async function createCatalogue(input: CatalogueInput, pdfFile: File): Promise<string> {
  const { pdf_url, pdf_size_bytes } = await uploadPdf(pdfFile);

  const client = getSupabaseAdminClient();
  const { data, error } = await client
    .from("catalogues")
    .insert({ ...input, pdf_url, pdf_size_bytes })
    .select("id")
    .single();
  if (error) throw error;

  revalidatePath("/admin/catalogues");
  revalidatePath("/");
  return data.id;
}

export async function updateCatalogue(
  id: string,
  input: CatalogueInput,
  pdfFile?: File | null,
): Promise<void> {
  const client = getSupabaseAdminClient();
  const patch: CatalogueInput & { pdf_url?: string; pdf_size_bytes?: number } = { ...input };

  if (pdfFile && pdfFile.size > 0) {
    const uploaded = await uploadPdf(pdfFile);
    patch.pdf_url = uploaded.pdf_url;
    patch.pdf_size_bytes = uploaded.pdf_size_bytes;
  }

  const { error } = await client.from("catalogues").update(patch).eq("id", id);
  if (error) throw error;

  revalidatePath("/admin/catalogues");
  revalidatePath("/");
}

export async function deleteCatalogue(id: string): Promise<void> {
  const client = getSupabaseAdminClient();
  // Storage object is left in place intentionally (same tradeoff as
  // product image deletes — see lib/admin/products.ts) rather than adding
  // a second failure mode to a simple row delete.
  const { error } = await client.from("catalogues").delete().eq("id", id);
  if (error) throw error;

  revalidatePath("/admin/catalogues");
  revalidatePath("/");
}
