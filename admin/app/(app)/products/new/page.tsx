import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getValueSuggestions, listPdfOptions } from "@/lib/data/products";
import { PageHeader } from "@/components/ui/Display";
import { ProductForm } from "@/components/products/ProductForm";
import { EMPTY_PRODUCT } from "@/lib/catalogue/productForm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ pdf?: string; page?: string }> }) {
  await requireRole("editor");
  const params = await searchParams;
  const [suggestions, pdfs] = await Promise.all([getValueSuggestions(), listPdfOptions()]);
  const db = await createClient();
  const { data: files } = await db.from("source_pdfs").select("id, file_url");
  return (
    <>
      <PageHeader eyebrow="Products" title="Add a product" description="Start with the name, code and a photo. Everything else can be added later." />
      <ProductForm
        productId={null}
        initial={{ ...EMPTY_PRODUCT, source_pdf_id: params.pdf ?? "", source_page: params.page ?? "" }}
        suggestions={suggestions}
        pdfs={pdfs}
        canEdit
        publicUrl={null}
        pdfFileUrls={Object.fromEntries((files ?? []).map((f) => [f.id, f.file_url]))}
      />
    </>
  );
}
