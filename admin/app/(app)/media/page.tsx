import type { Metadata } from "next";
import Link from "next/link";
import { ImageOff, Images } from "lucide-react";
import { requireRole, roleAtLeast } from "@/lib/auth";
import { brokenProductImages, listMedia } from "@/lib/data/media";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui/Display";
import { Pagination } from "@/components/ui/Pagination";
import { PdfSearch } from "@/components/pdfs/PdfSearch";
import { MediaGrid, MediaUploadButton } from "@/components/media/MediaGrid";
import { PDF_BUCKET } from "@/lib/env";
import { plural } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ProductStatus } from "@/lib/catalogue/product";

export const metadata: Metadata = { title: "Images" };

type Params = { tab?: string; q?: string; unused?: string; page?: string };

export default async function MediaPage({ searchParams }: { searchParams: Promise<Params> }) {
  const session = await requireRole("viewer");
  const params = await searchParams;
  const tab = params.tab === "broken" ? "broken" : params.tab === "files" ? "files" : "images";
  const canEdit = roleAtLeast(session.role, "editor");
  const tabs = [
    { key: "images", label: "Images", href: "/media" },
    { key: "files", label: "PDF storage", href: "/media?tab=files" },
    { key: "broken", label: "Broken links", href: "/media?tab=broken" },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Catalogue"
        title="Images"
        description="Every image stored for the website, and where it's used. Files are only deleted when nothing uses them."
        actions={canEdit && tab === "images" && <MediaUploadButton />}
      />
      <nav className="mb-4 flex gap-1 border-b border-line" aria-label="Media sections">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn("-mb-px border-b-2 px-3 py-2 text-sm", tab === t.key ? "border-copper font-medium text-ink" : "border-transparent text-ink-muted hover:text-ink")}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {tab === "broken" ? <Broken /> : <Library params={params} bucket={tab === "files" ? PDF_BUCKET : undefined} isOwner={roleAtLeast(session.role, "owner")} canEdit={canEdit} />}
    </>
  );
}

async function Library({ params, bucket, isOwner, canEdit }: { params: Params; bucket?: string; isOwner: boolean; canEdit: boolean }) {
  const page = Math.max(1, Number(params.page) || 1);
  const res = await listMedia({ bucket, q: params.q, unused: params.unused === "1", page });
  const base = bucket ? "/media?tab=files" : "/media";
  const sep = base.includes("?") ? "&" : "?";
  return (
    <Card>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <PdfSearch initial={params.q ?? ""} placeholder="Search by file or folder name" />
        <Link
          href={params.unused === "1" ? base : `${base}${sep}unused=1`}
          className={cn("text-sm", params.unused === "1" ? "font-medium text-copper-strong" : "text-ink-muted hover:text-ink")}
          aria-pressed={params.unused === "1"}
        >
          {params.unused === "1" ? "✓ Unused only" : "Show unused only"}
        </Link>
      </div>
      <div className="border-t border-line px-4 py-2.5 text-sm text-ink-muted">{plural(res.total, "file")}</div>
      {res.items.length === 0 ? (
        <EmptyState icon={<Images className="size-5" />} title={params.unused === "1" ? "No unused files" : "No files found"} />
      ) : (
        <MediaGrid items={res.items} isOwner={isOwner} canEdit={canEdit && !bucket} pdf={Boolean(bucket)} />
      )}
      <Pagination
        page={page}
        pageSize={res.pageSize}
        total={res.total}
        basePath="/media"
        params={{ tab: bucket ? "files" : undefined, q: params.q, unused: params.unused }}
      />
    </Card>
  );
}

async function Broken() {
  const rows = await brokenProductImages();
  return (
    <Card>
      {rows.length === 0 ? (
        <EmptyState icon={<ImageOff className="size-5" />} title="No broken image links">
          Every product image points to a file that exists.
        </EmptyState>
      ) : (
        <>
          <p className="border-b border-line px-5 py-3 text-sm text-ink-muted">
            These products point to an image file that is missing from storage. Open the product and replace or remove the image.
          </p>
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.image_id}>
                <Link href={`/products/${r.product_id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-muted">
                  <ImageOff className="size-5 shrink-0 text-danger" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{r.product_name}</div>
                    <div className="truncate font-mono text-xs text-ink-faint">{r.image_url.split("/object/public/")[1]}</div>
                  </div>
                  <StatusBadge status={r.product_status as ProductStatus} />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
