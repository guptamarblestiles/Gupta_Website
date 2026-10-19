import "server-only";
import { createClient } from "@/lib/supabase/server";
import { searchTerm } from "@/lib/data/products";

export type PdfRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  original_filename: string;
  file_url: string | null;
  file_size_bytes: number | null;
  page_count: number | null;
  storage_path: string | null;
  status: "uploading" | "ready" | "failed" | "archived";
  import_status: "not_started" | "in_progress" | "reviewed";
  created_at: string;
  updated_at: string;
  product_count: number;
  pending_count: number;
};

export async function listPdfs({ q, archived }: { q?: string; archived?: boolean }) {
  const db = await createClient();
  let query = db
    .from("source_pdfs")
    .select("*, products(count), pdf_import_candidates(status)")
    .order("created_at", { ascending: false });
  const term = searchTerm(q);
  if (term) query = query.or(`title.ilike.%${term}%,original_filename.ilike.%${term}%`);
  query = archived ? query.eq("status", "archived") : query.neq("status", "archived");
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((r) => {
    const { products, pdf_import_candidates, ...rest } = r as typeof r & {
      products: { count: number }[];
      pdf_import_candidates: { status: string }[];
    };
    return {
      ...rest,
      product_count: products?.[0]?.count ?? 0,
      pending_count: (pdf_import_candidates ?? []).filter((c: { status: string }) => c.status === "pending").length,
    } as PdfRow;
  });
}

export async function getPdf(id: string): Promise<PdfRow | null> {
  const db = await createClient();
  const { data, error } = await db.from("source_pdfs").select("*, products(count)").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { products, ...rest } = data as typeof data & { products: { count: number }[] };
  return { ...rest, product_count: products?.[0]?.count ?? 0, pending_count: 0 } as PdfRow;
}

export async function pdfProducts(id: string) {
  const db = await createClient();
  const { data, error } = await db
    .from("products")
    .select("id, name, product_code, status, source_page, product_images(image_url, sort_order)")
    .eq("source_pdf_id", id)
    .order("source_page", { ascending: true, nullsFirst: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map((p) => {
    const imgs = [...((p.product_images as { image_url: string; sort_order: number }[]) ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    return { id: p.id as string, name: p.name as string, product_code: p.product_code as string, status: p.status as string, source_page: p.source_page as number | null, thumbnail: imgs[0]?.image_url ?? null };
  });
}
