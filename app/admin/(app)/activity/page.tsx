import type { Metadata } from "next";
import Link from "next/link";
import { Activity } from "lucide-react";
import { requireRole } from "@admin/lib/auth";
import { createClient } from "@admin/lib/supabase/server";
import { Card, EmptyState, PageHeader } from "@admin/components/ui/Display";
import { Pagination } from "@admin/components/ui/Pagination";
import { activityHref, describeActivity, FIELD_LABELS } from "@admin/lib/activity";
import { formatDateTime } from "@admin/lib/format";
import { cn } from "@admin/lib/cn";

export const metadata: Metadata = { title: "Activity log" };

const PAGE_SIZE = 40;
const TYPES = [
  { key: "", label: "Everything" },
  { key: "products", label: "Products" },
  { key: "source_pdfs", label: "PDFs" },
  { key: "categories", label: "Categories" },
  { key: "catalogues", label: "Homepage" },
  { key: "enquiries", label: "Enquiries" },
  { key: "admin_users", label: "Team" },
];

function show(v: unknown): string {
  if (v === null || v === undefined || v === "") return "empty";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "empty";
  if (typeof v === "boolean") return v ? "yes" : "no";
  const s = String(v);
  return s.length > 60 ? `${s.slice(0, 57)}…` : s;
}

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ type?: string; page?: string; id?: string }> }) {
  await requireRole("viewer");
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const db = await createClient();
  let query = db.from("audit_log").select("*", { count: "exact" }).order("occurred_at", { ascending: false });
  if (params.type) query = query.eq("entity_type", params.type);
  if (params.id) query = query.eq("entity_id", params.id);
  const { data, error, count } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) throw error;

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Activity log"
        description="Every change to products, PDFs, categories, the homepage, enquiries and the team — recorded by the database itself, with who made it."
      />
      <nav className="mb-4 flex flex-wrap gap-1" aria-label="Filter activity">
        {TYPES.map((t) => (
          <Link
            key={t.key}
            href={t.key ? `/activity?type=${t.key}` : "/activity"}
            aria-current={(params.type ?? "") === t.key ? "page" : undefined}
            className={cn("rounded-full px-3 py-1 text-sm", (params.type ?? "") === t.key ? "bg-ink text-white" : "text-ink-muted hover:bg-sunken")}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <Card>
        {(data ?? []).length === 0 ? (
          <EmptyState icon={<Activity className="size-5" />} title="Nothing recorded yet" />
        ) : (
          <ol className="divide-y divide-line">
            {(data ?? []).map((a) => {
              const href = activityHref(a);
              const changes = a.changes && typeof a.changes === "object" && !("product_id" in a.changes) ? (a.changes as Record<string, [unknown, unknown]>) : null;
              return (
                <li key={a.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                    <span className="font-medium">{a.actor_email ?? "Import script / database"}</span>
                    {href ? (
                      <Link href={href} className="hover:underline">
                        {describeActivity(a)}
                      </Link>
                    ) : (
                      <span>{describeActivity(a)}</span>
                    )}
                    <time className="ml-auto text-xs text-ink-faint" dateTime={a.occurred_at}>
                      {formatDateTime(a.occurred_at)}
                    </time>
                  </div>
                  {changes && Object.keys(changes).length > 0 && (
                    <ul className="mt-1.5 space-y-0.5 text-xs text-ink-muted">
                      {Object.entries(changes)
                        .filter(([k]) => !["is_visible", "archived_at", "wall_or_floor"].includes(k) || Object.keys(changes).length === 1)
                        .slice(0, 8)
                        .map(([k, [from, to]]) => (
                          <li key={k}>
                            <span className="font-medium text-ink">{FIELD_LABELS[k] ?? k.replace(/_/g, " ")}</span>: <span className="line-through decoration-ink-faint/60">{show(from)}</span> → {show(to)}
                          </li>
                        ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} basePath="/activity" params={{ type: params.type, id: params.id }} />
      </Card>
    </>
  );
}
