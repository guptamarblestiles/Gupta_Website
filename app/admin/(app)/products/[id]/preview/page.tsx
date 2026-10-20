import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Download, ExternalLink } from "lucide-react";
import { requireRole } from "@admin/lib/auth";
import { getProduct } from "@admin/lib/data/products";
import { Notice } from "@admin/components/ui/Display";
import { publicProductUrl } from "@admin/lib/publicSite";
import { STATUS_LABELS } from "@admin/lib/catalogue/product";

export const metadata: Metadata = { title: "Preview" };

/**
 * How the product will read on the website, available for drafts too.
 * Drafts can't be opened on the public site (RLS hides them from visitors),
 * so the preview is rendered here, behind the admin login, from the same
 * fields the public product page uses.
 */
export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("viewer");
  const { id } = await params;
  const found = await getProduct(id).catch(() => null);
  if (!found) notFound();
  const { product: p, images, sourcePdf } = found;
  const publicUrl = p.status === "published" ? publicProductUrl(p.slug) : null;
  const specs: [string, string | number | null | undefined][] = [
    ["Size", p.size],
    ["Finish", p.finish],
    ["Application", p.application ?? p.wall_or_floor],
    ["Thickness", p.thickness],
    ["Material", p.material],
    ["Collection", p.series ?? p.collection],
    ["Pattern", p.pattern],
    ["Colour", p.color],
    ["Rooms", p.rooms?.length ? p.rooms.join(", ") : null],
    ["Faces", p.faces],
    ["Tiles per box", p.tiles_per_box],
    ["Coverage per box", p.coverage_per_box],
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <Notice tone={p.status === "published" ? "success" : "warning"} className="mb-6">
        <span className="font-medium">Preview — {STATUS_LABELS[p.status]}.</span>{" "}
        {p.status === "published" ? (
          publicUrl ? (
            <a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">
              Open the live page <ExternalLink className="size-3.5" />
            </a>
          ) : (
            "This product is live on the website."
          )
        ) : (
          "Customers can't see this product until it is published."
        )}
      </Notice>
      <article className="grid gap-10 rounded-2xl bg-white p-6 shadow-card ring-1 ring-line md:grid-cols-2 md:p-10">
        <div className="space-y-3">
          {images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={images[0].image_url} alt={p.name} className="aspect-square w-full rounded-xl object-cover" />
          ) : (
            <div className="grid aspect-square place-items-center rounded-xl border border-dashed border-line-strong text-ink-faint">No image yet</div>
          )}
          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {images.slice(1).map((img) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={img.id} src={img.image_url} alt="" className="aspect-square rounded-lg object-cover" />
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="text-xs font-medium tracking-[0.14em] text-copper-strong uppercase">{p.category}</p>
          <h1 className="mt-2 font-display text-4xl leading-tight">{p.name}</h1>
          <p className="mt-1 font-mono text-sm text-ink-faint">{p.product_code}</p>
          {p.price != null && (
            <p className="mt-4 text-xl">
              {p.price_note && <span className="text-sm text-ink-muted">{p.price_note} </span>}₹{Number(p.price).toLocaleString("en-IN")}
              {p.price_unit && <span className="text-sm text-ink-muted"> / {p.price_unit}</span>}
            </p>
          )}
          {p.description && <p className="mt-5 leading-relaxed text-ink-muted">{p.description}</p>}
          <dl className="mt-6 divide-y divide-line border-y border-line">
            {specs
              .filter(([, value]) => value !== null && value !== undefined && value !== "")
              .map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 py-2.5 text-sm">
                  <dt className="text-ink-muted">{label}</dt>
                  <dd className="text-right font-medium">{value}</dd>
                </div>
              ))}
          </dl>
          {sourcePdf && (
            <div className="mt-6 rounded-xl bg-admin-surface-muted p-4 text-sm">
              <p className="font-medium">{sourcePdf.title}</p>
              {sourcePdf.file_url ? (
                <a href={`${sourcePdf.file_url}?download=${encodeURIComponent(sourcePdf.original_filename)}`} className="mt-1 inline-flex items-center gap-1 text-copper-strong underline">
                  <Download className="size-3.5" /> Download catalogue{p.source_page ? ` (see page ${p.source_page})` : ""}
                </a>
              ) : (
                <p className="mt-1 text-ink-muted">Catalogue download unavailable</p>
              )}
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
