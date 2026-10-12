import { Download, ExternalLink, FileText } from "lucide-react";
import type { Product } from "@/types/product";

function formatSize(bytes?: number): string | undefined {
  if (!bytes) return undefined;
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * "Download Resources" — links to the full original PDF the product was
 * curated from. View opens it in a new tab at the product's page (#page=N,
 * honoured by browser PDF viewers); Download uses the `download` attribute.
 * When the PDF isn't uploaded yet (no file_url) it shows an explicit
 * unavailable state rather than a broken link. Renders nothing for products
 * with no source PDF at all.
 */
export function DownloadResources({ product }: { product: Product }) {
  const pdf = product.sourcePdf;
  if (!pdf) return null;

  const size = formatSize(pdf.fileSizeBytes);
  const viewHref = pdf.fileUrl
    ? product.sourcePage
      ? `${pdf.fileUrl}#page=${product.sourcePage}`
      : pdf.fileUrl
    : undefined;
  const actionClass =
    "inline-flex items-center gap-2 border border-outline-variant px-5 py-3 font-body text-label uppercase text-on-surface transition-colors hover:border-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary";

  return (
    <section aria-labelledby="download-resources" className="mb-10">
      <h2
        id="download-resources"
        className="mb-4 font-body text-label uppercase text-on-surface-variant"
      >
        Download Resources
      </h2>
      <div className="flex flex-col gap-4 border border-outline-variant/50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <FileText size={20} className="mt-0.5 shrink-0 text-secondary-strong" aria-hidden="true" />
          <div>
            <p className="font-body text-body text-on-surface">{pdf.title}</p>
            <p className="font-body text-sm text-on-surface-variant">
              Full catalogue PDF{product.sourcePage ? ` · this tile on page ${product.sourcePage}` : ""}
              {size ? ` · ${size}` : ""}
            </p>
          </div>
        </div>

        {viewHref && pdf.fileUrl ? (
          <div className="flex flex-wrap gap-3">
            <a href={viewHref} target="_blank" rel="noopener noreferrer" className={actionClass}>
              <ExternalLink size={16} aria-hidden="true" />
              View PDF
            </a>
            <a href={pdf.fileUrl} download={pdf.originalFilename} className={actionClass}>
              <Download size={16} aria-hidden="true" />
              Download
            </a>
          </div>
        ) : (
          <p className="font-body text-sm text-on-surface-variant">
            PDF currently unavailable — contact us and we&apos;ll send it over.
          </p>
        )}
      </div>
    </section>
  );
}
