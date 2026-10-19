import "server-only";
import { createClient } from "@/lib/supabase/server";
import { PRODUCT_STATUSES, type ProductRow, type ProductStatus } from "@/lib/catalogue/product";

export const PRODUCT_PAGE_SIZE = 25;
const MISSING_COLUMNS = ["size", "finish", "application", "thickness", "series", "color", "pattern", "material"];

export type ProductListParams = {
  q?: string;
  status?: string;
  category?: string;
  size?: string;
  finish?: string;
  series?: string;
  pdf?: string; // source pdf id, "none" = missing
  images?: string; // "none" = no images
  missing?: string; // a filter column that is empty
  sort?: string; // "updated" | "name" | "code"
  page?: string;
};

export type ProductListRow = {
  id: string;
  slug: string;
  name: string;
  product_code: string;
  category: string;
  series: string | null;
  collection: string | null;
  size: string | null;
  finish: string | null;
  status: ProductStatus;
  updated_at: string;
  source_pdf_id: string | null;
  source_page: number | null;
  thumbnail: string | null;
  image_count: number;
  pdf_title: string | null;
  pdf_has_file: boolean;
};

/** PostgREST `or()` treats , ( ) as syntax; strip them from typed search. */
export function searchTerm(raw: string | undefined): string {
  return (raw ?? "").replace(/[,()"%\\]/g, " ").trim().slice(0, 80);
}

export async function listProducts(params: ProductListParams) {
  const db = await createClient();
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const from = (page - 1) * PRODUCT_PAGE_SIZE;

  const imagesJoin = params.images === "none" ? "product_images!left(id)" : "product_images(image_url, sort_order)";
  let query = db
    .from("products")
    .select(
      `id, slug, name, product_code, category, series, collection, size, finish, status, updated_at, source_pdf_id, source_page,
       ${imagesJoin}, source_pdfs(title, file_url)`,
      { count: "exact" },
    );

  const q = searchTerm(params.q);
  if (q) query = query.or(`name.ilike.%${q}%,product_code.ilike.%${q}%,slug.ilike.%${q}%`);
  if (params.status && (PRODUCT_STATUSES as readonly string[]).includes(params.status)) query = query.eq("status", params.status);
  else if (params.status !== "all") query = query.neq("status", "archived");
  if (params.category) query = query.eq("category", params.category);
  if (params.size) query = query.eq("size", params.size);
  if (params.finish) query = query.eq("finish", params.finish);
  if (params.series) query = query.or(`series.eq.${JSON.stringify(params.series)},and(series.is.null,collection.eq.${JSON.stringify(params.series)})`);
  if (params.pdf === "none") query = query.is("source_pdf_id", null);
  else if (params.pdf) query = query.eq("source_pdf_id", params.pdf);
  if (params.images === "none") query = query.is("product_images", null);
  if (params.missing && MISSING_COLUMNS.includes(params.missing)) {
    if (params.missing === "application") query = query.is("application", null).is("wall_or_floor", null);
    else if (params.missing === "series") query = query.is("series", null).is("collection", null);
    else query = query.is(params.missing, null);
  }

  if (params.sort === "name") query = query.order("name", { ascending: true });
  else if (params.sort === "code") query = query.order("product_code", { ascending: true });
  else query = query.order("updated_at", { ascending: false });

  const { data, error, count } = await query.order("id").range(from, from + PRODUCT_PAGE_SIZE - 1);
  if (error) throw error;

  type Raw = Omit<ProductListRow, "thumbnail" | "image_count" | "pdf_title" | "pdf_has_file"> & {
    product_images: { image_url?: string; sort_order?: number }[] | null;
    source_pdfs: { title: string; file_url: string | null } | null;
  };
  const rows: ProductListRow[] = ((data ?? []) as unknown as Raw[]).map((r) => {
    const images = [...(r.product_images ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const { product_images: _i, source_pdfs: pdf, ...rest } = r;
    void _i;
    return {
      ...rest,
      thumbnail: images[0]?.image_url ?? null,
      image_count: params.images === "none" ? 0 : images.length,
      pdf_title: pdf?.title ?? null,
      pdf_has_file: Boolean(pdf?.file_url),
    };
  });
  return { rows, total: count ?? rows.length, page, pageSize: PRODUCT_PAGE_SIZE };
}

export type ProductImage = { id: string; image_url: string; sort_order: number };

export async function getProduct(id: string) {
  const db = await createClient();
  const { data, error } = await db.from("products").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: images, error: imgErr } = await db
    .from("product_images")
    .select("id, image_url, sort_order")
    .eq("product_id", id)
    .order("sort_order");
  if (imgErr) throw imgErr;
  let sourcePdf: { id: string; title: string; file_url: string | null; page_count: number | null; original_filename: string } | null = null;
  if (data.source_pdf_id) {
    const { data: pdf } = await db
      .from("source_pdfs")
      .select("id, title, file_url, page_count, original_filename")
      .eq("id", data.source_pdf_id)
      .maybeSingle();
    sourcePdf = pdf;
  }
  return { product: { ...data, rooms: data.rooms ?? [] } as ProductRow, images: (images ?? []) as ProductImage[], sourcePdf };
}

export type FilterValue = { filter: string; value: string; total: number; published: number };

export async function getFilterValues(): Promise<FilterValue[]> {
  const db = await createClient();
  const { data, error } = await db.rpc("admin_filter_values");
  if (error) throw error;
  return ((data ?? []) as { filter: string; value: string; total: number | string; published: number | string }[]).map((r) => ({
    filter: r.filter,
    value: r.value,
    total: Number(r.total),
    published: Number(r.published),
  }));
}

/** Existing values per field, most used first — for form suggestions. */
export async function getValueSuggestions(): Promise<Record<string, string[]>> {
  const [values, categories] = await Promise.all([getFilterValues(), listCategoryNames()]);
  const out: Record<string, string[]> = {};
  for (const v of [...values].sort((a, b) => b.total - a.total)) (out[v.filter] ??= []).push(v.value);
  out.category = [...new Set([...categories, ...(out.category ?? [])])];
  return out;
}

export async function listCategoryNames(): Promise<string[]> {
  const db = await createClient();
  const { data } = await db.from("categories").select("name").order("sort_order");
  return (data ?? []).map((r) => r.name as string);
}

export type PdfOption = { id: string; title: string; page_count: number | null; archived: boolean };

export async function listPdfOptions(): Promise<PdfOption[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("source_pdfs")
    .select("id, title, page_count, status")
    .neq("status", "uploading")
    .order("title");
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.id, title: r.title, page_count: r.page_count, archived: r.status === "archived" }));
}

/** What else points at a product — shown before a permanent delete. */
export async function productReferences(id: string, name: string) {
  const db = await createClient();
  const [enq, cands] = await Promise.all([
    db.from("enquiries").select("id", { count: "exact", head: true }).or(`product_id.eq.${id},product_name.eq.${JSON.stringify(name)}`),
    db.from("pdf_import_candidates").select("id", { count: "exact", head: true }).eq("product_id", id),
  ]);
  return { enquiries: enq.count ?? 0, importCandidates: cands.count ?? 0 };
}
