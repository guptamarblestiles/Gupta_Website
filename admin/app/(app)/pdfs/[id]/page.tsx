import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, ExternalLink, Sparkles } from "lucide-react";
import { requireRole, roleAtLeast } from "@/lib/auth";
import { getPdf, pdfProducts } from "@/lib/data/pdfs";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, CardHeader, EmptyState, Notice, PageHeader, StatusBadge, Thumb } from "@/components/ui/Display";
import { LinkButton, buttonClass } from "@/components/ui/Button";
import { PdfDetailActions } from "@/components/pdfs/PdfDetailActions";
import { formatBytes } from "@/lib/catalogue/normalize";
import { formatDateTime, plural } from "@/lib/format";
import type { ProductStatus } from "@/lib/catalogue/product";

export const metadata: Metadata = { title: "PDF details" };

export default async function PdfDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("viewer");
  const { id } = await params;
  const pdf = await getPdf(id).catch(() => null);
  if (!pdf) notFound();
  const products = await pdfProducts(id);
  const db = await createClient();
  const { data: cands } = await db.from("pdf_import_candidates").select("status").eq("source_pdf_id", id);
  const counts = (cands ?? []).reduce<Record<string, number>>((acc, c) => ((acc[c.status] = (acc[c.status] ?? 0) + 1), acc), {});
  const canEdit = roleAtLeast(session.role, "editor");
  const reviewCount = products.filter((p) => p.status === "review").length;

  return (
    <>
      <PageHeader
        eyebrow="PDF library"
        title={pdf.title}
        description={`${pdf.original_filename} · ${formatBytes(pdf.file_size_bytes)}${pdf.page_count ? ` · ${pdf.page_count} pages` : ""} · added ${formatDateTime(pdf.created_at)}`}
        actions={
          canEdit &&
          pdf.file_url && (
            <LinkButton href={`/pdfs/${id}/import`} variant="primary" icon={<Sparkles className="size-4" />}>
              {counts.pending || counts.created ? "Continue importing" : "Find products in this PDF"}
            </LinkButton>
          )
        }
      />

      {pdf.status === "uploading" && <Notice tone="warning" className="mb-6">This upload never finished. Upload the same file again from the library — it will pick up this record instead of creating a new one.</Notice>}
      {pdf.status === "failed" && <Notice tone="danger" className="mb-6">The last upload of this file failed. Upload the same file again to complete it.</Notice>}
      {pdf.status === "archived" && <Notice tone="info" className="mb-6">Archived. Products that link to it still offer the download.</Notice>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader
              title="Products from this PDF"
              description={plural(products.length, "product")}
              action={
                reviewCount > 0 && (
                  <LinkButton size="sm" href={`/products?pdf=${id}&status=review`}>
                    Review &amp; publish {reviewCount}
                  </LinkButton>
                )
              }
            />
            {products.length === 0 ? (
              <EmptyState title="No products linked yet">
                {canEdit ? "Use “Find products in this PDF”, or link existing products from their edit page." : "Nothing links to this PDF yet."}
              </EmptyState>
            ) : (
              <ul className="divide-y divide-line">
                {products.map((p) => (
                  <li key={p.id}>
                    <Link href={`/products/${p.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-muted">
                      <Thumb src={p.thumbnail} alt="" className="size-10" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{p.name}</div>
                        <div className="font-mono text-xs text-ink-faint">{p.product_code}</div>
                      </div>
                      <span className="hidden text-sm text-ink-faint sm:inline">{p.source_page ? `p. ${p.source_page}` : "page —"}</span>
                      <StatusBadge status={p.status as ProductStatus} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader title="File" />
            <div className="space-y-3 p-5 text-sm">
              {pdf.file_url ? (
                <div className="flex flex-wrap gap-2">
                  <a href={pdf.file_url} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm")}>
                    <ExternalLink className="size-4" /> View
                  </a>
                  <a href={`${pdf.file_url}?download=${encodeURIComponent(pdf.original_filename)}`} className={buttonClass("secondary", "sm")}>
                    <Download className="size-4" /> Download original
                  </a>
                </div>
              ) : (
                <Badge tone="danger">No file uploaded</Badge>
              )}
              <dl className="space-y-1.5 text-ink-muted">
                <Row label="Import">{pdf.import_status === "reviewed" ? "Fully reviewed" : pdf.import_status === "in_progress" ? "In progress" : "Not started"}</Row>
                <Row label="Tiles found">{(cands ?? []).length}</Row>
                {counts.pending ? <Row label="Waiting for review">{counts.pending}</Row> : null}
                {counts.created ? <Row label="Turned into products">{counts.created}</Row> : null}
                {counts.rejected ? <Row label="Rejected">{counts.rejected}</Row> : null}
              </dl>
            </div>
          </Card>
          {canEdit && (
            <PdfDetailActions
              id={id}
              title={pdf.title}
              description={pdf.description ?? ""}
              archived={pdf.status === "archived"}
              canDelete={roleAtLeast(session.role, "owner")}
              productCount={pdf.product_count}
              importStatus={pdf.import_status}
            />
          )}
        </aside>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt>{label}</dt>
      <dd className="font-medium text-ink">{children}</dd>
    </div>
  );
}
