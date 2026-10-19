import type { Metadata } from "next";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { searchTerm } from "@/lib/data/products";
import { Card, EmptyState, PageHeader } from "@/components/ui/Display";
import { Pagination } from "@/components/ui/Pagination";
import { PdfSearch } from "@/components/pdfs/PdfSearch";
import { EnquiryList, type EnquiryRow } from "@/components/enquiries/EnquiryList";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Enquiries" };

const PAGE_SIZE = 20;
const TABS = [
  { key: "open", label: "Open" },
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "in_progress", label: "In progress" },
  { key: "closed", label: "Closed" },
  { key: "all", label: "All" },
];

export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string; open?: string }> }) {
  // Customer contact details: owners and editors only (RLS enforces the same).
  await requireRole("editor");
  const params = await searchParams;
  const status = TABS.some((t) => t.key === params.status) ? params.status! : "open";
  const page = Math.max(1, Number(params.page) || 1);
  const db = await createClient();

  let query = db
    .from("enquiries")
    .select("id, name, email, phone, product_id, product_name, message, created_at, status, staff_notes, updated_at", { count: "exact" })
    .order("created_at", { ascending: false });
  if (status === "open") query = query.neq("status", "closed");
  else if (status !== "all") query = query.eq("status", status);
  const q = searchTerm(params.q);
  if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,product_name.ilike.%${q}%`);
  const { data, error, count } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) throw error;

  // Link enquiries to products where product_id is a real product id.
  const ids = [...new Set((data ?? []).map((e) => e.product_id).filter((x): x is string => Boolean(x && /^[0-9a-f-]{36}$/i.test(x))))];
  const { data: products } = ids.length ? await db.from("products").select("id, name").in("id", ids) : { data: [] };
  const productNames = Object.fromEntries((products ?? []).map((p) => [p.id, p.name as string]));

  return (
    <>
      <PageHeader eyebrow="Website" title="Enquiries" description="Messages sent from the website's enquiry form. Call, WhatsApp or email straight from here." />
      <nav className="mb-4 flex flex-wrap gap-1" aria-label="Filter by status">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "open" ? "/enquiries" : `/enquiries?status=${t.key}`}
            aria-current={status === t.key ? "page" : undefined}
            className={cn("rounded-full px-3 py-1 text-sm", status === t.key ? "bg-ink text-white" : "text-ink-muted hover:bg-sunken")}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <Card>
        <div className="p-4">
          <PdfSearch initial={params.q ?? ""} placeholder="Search by name, email, phone or product" />
        </div>
        {(data ?? []).length === 0 ? (
          <EmptyState icon={<Inbox className="size-5" />} title="No enquiries here">
            {status === "open" ? "Every enquiry has been handled." : "Try another tab."}
          </EmptyState>
        ) : (
          <EnquiryList rows={(data ?? []) as EnquiryRow[]} productNames={productNames} openId={params.open} />
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} basePath="/enquiries" params={{ status: params.status, q: params.q }} />
      </Card>
    </>
  );
}
