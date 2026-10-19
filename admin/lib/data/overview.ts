import "server-only";
import { createClient } from "@/lib/supabase/server";
import { brokenProductImages } from "@/lib/data/media";

export async function getOverview(includeEnquiries: boolean) {
  const db = await createClient();
  const count = (q: PromiseLike<{ count: number | null }>) => Promise.resolve(q).then((r) => r.count ?? 0);
  const head = { count: "exact" as const, head: true };

  const [published, draft, review, archived, noImagePublished, noImageAll, noPdf, pdfs, pdfsMissingFile, pendingCandidates, broken, recentActivity, enquiries, newEnquiries, codes] =
    await Promise.all([
      count(db.from("products").select("id", head).eq("status", "published")),
      count(db.from("products").select("id", head).eq("status", "draft")),
      count(db.from("products").select("id", head).eq("status", "review")),
      count(db.from("products").select("id", head).eq("status", "archived")),
      count(db.from("products").select("id, product_images!left(id)", head).eq("status", "published").is("product_images", null)),
      count(db.from("products").select("id, product_images!left(id)", head).neq("status", "archived").is("product_images", null)),
      count(db.from("products").select("id", head).neq("status", "archived").is("source_pdf_id", null)),
      count(db.from("source_pdfs").select("id", head).neq("status", "archived")),
      count(db.from("source_pdfs").select("id", head).neq("status", "archived").is("file_url", null)),
      count(db.from("pdf_import_candidates").select("id", head).eq("status", "pending")),
      brokenProductImages().catch(() => []),
      db.from("audit_log").select("id, occurred_at, actor_email, action, entity_type, entity_id, entity_label").order("occurred_at", { ascending: false }).limit(8),
      includeEnquiries
        ? db.from("enquiries").select("id, name, product_name, created_at, status").order("created_at", { ascending: false }).limit(5)
        : Promise.resolve({ data: [] as { id: string; name: string; product_name: string | null; created_at: string; status: string }[] }),
      includeEnquiries ? count(db.from("enquiries").select("id", head).eq("status", "new")) : Promise.resolve(0),
      db.from("products").select("id, name, product_code").neq("status", "archived").range(0, 9999),
    ]);

  // Codes that differ only by case/spacing ("GT-2001" vs "gt 2001") slip
  // past the database's exact unique constraint — flag them for a human.
  const seen = new Map<string, { id: string; name: string; product_code: string }[]>();
  for (const p of codes.data ?? []) {
    const key = (p.product_code as string).toLowerCase().replace(/[^a-z0-9]/g, "");
    seen.set(key, [...(seen.get(key) ?? []), p as { id: string; name: string; product_code: string }]);
  }
  const nearDuplicateCodes = [...seen.values()].filter((g) => g.length > 1);

  return {
    counts: { published, draft, review, archived, noImagePublished, noImageAll, noPdf, pdfs, pdfsMissingFile, pendingCandidates, newEnquiries },
    broken,
    nearDuplicateCodes,
    activity: recentActivity.data ?? [],
    enquiries: enquiries.data ?? [],
  };
}
