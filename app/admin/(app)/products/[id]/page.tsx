import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole, roleAtLeast } from "@admin/lib/auth";
import { getProduct, getValueSuggestions, listPdfOptions, productReferences } from "@admin/lib/data/products";
import { PageHeader, StatusBadge } from "@admin/components/ui/Display";
import { ProductForm } from "@admin/components/products/ProductForm";
import type { ProductFormValues } from "@admin/lib/catalogue/productForm";
import { ProductLifecycle } from "@admin/components/products/ProductLifecycle";
import { publicProductUrl } from "@admin/lib/publicSite";
import { createClient } from "@admin/lib/supabase/server";
import { formatDateTime } from "@admin/lib/format";

export const metadata: Metadata = { title: "Edit product" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("viewer");
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const found = await getProduct(id);
  if (!found) notFound();
  const { product: p, images } = found;
  const [suggestions, pdfs, refs] = await Promise.all([getValueSuggestions(), listPdfOptions(), productReferences(p.id, p.name)]);
  const db = await createClient();
  const { data: files } = await db.from("source_pdfs").select("id, file_url");

  const str = (x: unknown) => (x === null || x === undefined ? "" : String(x));
  const initial: ProductFormValues = {
    name: p.name,
    product_code: p.product_code,
    slug: p.slug,
    category: p.category,
    status: p.status,
    series: str(p.series ?? p.collection),
    finish: str(p.finish),
    finish_detail: str(p.finish_detail),
    size: str(p.size),
    application: str(p.application ?? p.wall_or_floor),
    rooms: p.rooms ?? [],
    pattern: str(p.pattern),
    color: str(p.color),
    thickness: str(p.thickness),
    material: str(p.material),
    faces: str(p.faces),
    tiles_per_box: str(p.tiles_per_box),
    coverage_per_box: str(p.coverage_per_box),
    price: str(p.price),
    price_unit: str(p.price_unit),
    price_note: str(p.price_note),
    description: p.description ?? "",
    source_pdf_id: str(p.source_pdf_id),
    source_page: str(p.source_page),
    review_note: str(p.review_note),
    images: images.map((i) => i.image_url),
  };

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <span className="font-mono normal-case tracking-normal">{p.product_code}</span>
            <StatusBadge status={p.status} />
          </span>
        }
        title={p.name}
        description={`Last changed ${formatDateTime(p.updated_at)}`}
      />
      <ProductForm
        key={p.updated_at}
        productId={p.id}
        initial={initial}
        suggestions={suggestions}
        pdfs={pdfs}
        canEdit={roleAtLeast(session.role, "editor")}
        publicUrl={publicProductUrl(p.slug)}
        pdfFileUrls={Object.fromEntries((files ?? []).map((f) => [f.id, f.file_url]))}
      />
      {roleAtLeast(session.role, "editor") && (
        <ProductLifecycle
          id={p.id}
          name={p.name}
          code={p.product_code}
          status={p.status}
          canDelete={roleAtLeast(session.role, "owner")}
          references={refs}
          imageCount={images.length}
        />
      )}
    </>
  );
}
