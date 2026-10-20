import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@admin/lib/auth";
import { getPdf } from "@admin/lib/data/pdfs";
import { getValueSuggestions } from "@admin/lib/data/products";
import { createClient } from "@admin/lib/supabase/server";
import { Notice, PageHeader } from "@admin/components/ui/Display";
import { LinkButton } from "@admin/components/ui/Button";
import { ImportWorkspace } from "@admin/components/import/ImportWorkspace";
import type { Candidate } from "@admin/lib/catalogue/candidate";

export const metadata: Metadata = { title: "Import products from PDF" };

export default async function ImportPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("editor");
  const { id } = await params;
  const pdf = await getPdf(id).catch(() => null);
  if (!pdf) notFound();
  if (!pdf.file_url) {
    return (
      <>
        <PageHeader eyebrow="Import" title={pdf.title} />
        <Notice tone="warning" title="This PDF has no uploaded file">
          Upload the file from the PDF library first. <LinkButton href="/admin/pdfs?upload=1" size="sm" className="ml-2">Upload</LinkButton>
        </Notice>
      </>
    );
  }
  const db = await createClient();
  const [{ data: candidates, error }, suggestions] = await Promise.all([
    db
      .from("pdf_import_candidates")
      .select("id, source_pdf_id, page, crop, crop_key, image_path, image_url, image_width, image_height, detection, suggested, warnings, status, product_id, updated_at")
      .eq("source_pdf_id", id)
      .order("page"),
    getValueSuggestions(),
  ]);
  if (error) throw error;

  return (
    <>
      <PageHeader
        eyebrow="Import products"
        title={pdf.title}
        description="Find the tiles, check each one, and create products. Nothing goes on the website until you publish it."
      />
      <ImportWorkspace
        pdf={{ id: pdf.id, slug: pdf.slug, title: pdf.title, file_url: pdf.file_url, page_count: pdf.page_count }}
        initialCandidates={(candidates ?? []) as Candidate[]}
        suggestions={suggestions}
      />
    </>
  );
}
