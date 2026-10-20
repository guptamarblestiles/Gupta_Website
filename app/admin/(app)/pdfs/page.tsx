import type { Metadata } from "next";
import Link from "next/link";
import { Archive, FileText } from "lucide-react";
import { requireRole, roleAtLeast } from "@admin/lib/auth";
import { listPdfs } from "@admin/lib/data/pdfs";
import { Badge, Card, EmptyState, PageHeader } from "@admin/components/ui/Display";
import { PdfLibraryActions } from "@admin/components/pdfs/PdfLibraryActions";
import { PdfSearch } from "@admin/components/pdfs/PdfSearch";
import { formatBytes } from "@admin/lib/catalogue/normalize";
import { formatDate, plural } from "@admin/lib/format";

export const metadata: Metadata = { title: "PDF library" };

const IMPORT_LABEL = { not_started: "Not started", in_progress: "In progress", reviewed: "Reviewed" } as const;

export default async function PdfsPage({ searchParams }: { searchParams: Promise<{ q?: string; archived?: string; upload?: string }> }) {
  const session = await requireRole("viewer");
  const params = await searchParams;
  const archived = params.archived === "1";
  const pdfs = await listPdfs({ q: params.q, archived });
  const canEdit = roleAtLeast(session.role, "editor");

  return (
    <>
      <PageHeader
        eyebrow="Catalogue"
        title="PDF library"
        description="Original brand catalogues. Products link to the PDF they came from, and customers can download it from the product page."
        actions={canEdit && <PdfLibraryActions openUpload={params.upload === "1"} />}
      />
      <Card>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <PdfSearch initial={params.q ?? ""} />
          <Link href={archived ? "/pdfs" : "/pdfs?archived=1"} className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
            <Archive className="size-4" /> {archived ? "Back to active PDFs" : "Show archived"}
          </Link>
        </div>
        <div className="border-t border-line px-4 py-2.5 text-sm text-ink-muted">
          {plural(pdfs.length, archived ? "archived PDF" : "PDF")}
        </div>
        {pdfs.length === 0 ? (
          <EmptyState icon={<FileText className="size-5" />} title={params.q ? "No PDFs match" : archived ? "Nothing archived" : "No PDFs yet"}>
            {!params.q && !archived && "Upload a brand catalogue to link it to products and import new designs from it."}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {pdfs.map((pdf) => (
              <li key={pdf.id}>
                <Link href={`/admin/pdfs/${pdf.id}`} className="flex flex-col gap-2 px-4 py-3.5 hover:bg-admin-surface-muted sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-danger-soft text-[11px] font-bold text-danger">PDF</div>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-ink">{pdf.title}</div>
                      <div className="truncate text-xs text-ink-faint">
                        {pdf.original_filename} · {formatBytes(pdf.file_size_bytes)}
                        {pdf.page_count ? ` · ${pdf.page_count} pages` : ""} · added {formatDate(pdf.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pl-13 sm:pl-0">
                    {pdf.status === "uploading" && <Badge tone="warning">Upload not finished</Badge>}
                    {pdf.status === "failed" && <Badge tone="danger">Upload failed</Badge>}
                    {!pdf.file_url && pdf.status !== "uploading" && pdf.status !== "failed" && <Badge tone="danger">File missing</Badge>}
                    <Badge tone={pdf.product_count ? "copper" : "neutral"}>{plural(pdf.product_count, "product")}</Badge>
                    {pdf.pending_count > 0 && <Badge tone="warning">{pdf.pending_count} to review</Badge>}
                    <Badge tone={pdf.import_status === "reviewed" ? "success" : "neutral"}>Import: {IMPORT_LABEL[pdf.import_status]}</Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
