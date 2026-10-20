import type { Metadata } from "next";
import { requireRole, roleAtLeast } from "@admin/lib/auth";
import { createClient } from "@admin/lib/supabase/server";
import { PageHeader } from "@admin/components/ui/Display";
import { HomepageCatalogues } from "@admin/components/catalogue/HomepageCatalogues";

export const metadata: Metadata = { title: "Homepage catalogues" };

export default async function CataloguesPage() {
  const session = await requireRole("viewer");
  const db = await createClient();
  const [{ data: rows, error }, { data: pdfs }] = await Promise.all([
    db.from("catalogues").select("id, title, description, pdf_url, thumbnail_url, is_visible, sort_order, source_pdf_id").order("sort_order"),
    db.from("source_pdfs").select("id, title").eq("status", "ready").not("file_url", "is", null).order("title"),
  ]);
  if (error) throw error;
  const used = new Set((rows ?? []).map((r) => r.source_pdf_id).filter(Boolean));
  return (
    <>
      <PageHeader
        eyebrow="Website"
        title="Homepage catalogues"
        description="The PDF catalogues featured in the “Catalogues” section of the homepage. Customers can open or download them."
      />
      <HomepageCatalogues
        rows={rows ?? []}
        available={(pdfs ?? []).filter((p) => !used.has(p.id))}
        canEdit={roleAtLeast(session.role, "editor")}
      />
    </>
  );
}
