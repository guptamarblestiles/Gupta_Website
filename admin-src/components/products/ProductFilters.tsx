"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { Input, Select } from "@admin/components/ui/Field";
import { Button } from "@admin/components/ui/Button";

type Params = Record<string, string | undefined>;

/** Filter bar: every change becomes a URL search param, so the server does
 *  the filtering/pagination and filtered views can be bookmarked or shared. */
export function ProductFilters({
  params,
  categories,
  sizes,
  finishes,
  series,
  pdfs,
}: {
  params: Params;
  categories: string[];
  sizes: string[];
  finishes: string[];
  series: string[];
  pdfs: { id: string; title: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.q ?? "");
  const [prevQ, setPrevQ] = useState(params.q);
  if (params.q !== prevQ) {
    setPrevQ(params.q);
    setQ(params.q ?? "");
  }

  const push = (patch: Params) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...params, ...patch, page: undefined })) if (v) next.set(k, v);
    startTransition(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  useEffect(() => {
    if ((params.q ?? "") === q) return;
    const t = setTimeout(() => push({ q: q.trim() || undefined }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const select = (key: string, label: string, list: string[] | { id: string; title: string }[], extra?: { value: string; label: string }[]) => (
    <label className="min-w-0">
      <span className="sr-only">{label}</span>
      <Select value={params[key] ?? ""} onChange={(e) => push({ [key]: e.target.value || undefined })} className="h-9 text-sm">
        <option value="">{label}: all</option>
        {extra?.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        {list.map((o) =>
          typeof o === "string" ? (
            <option key={o} value={o}>
              {o}
            </option>
          ) : (
            <option key={o.id} value={o.id}>
              {o.title}
            </option>
          ),
        )}
      </Select>
    </label>
  );

  const active = Object.entries(params).some(([k, v]) => v && k !== "page" && k !== "sort");

  return (
    <div className="space-y-3 p-4" aria-busy={pending}>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <label htmlFor="product-search" className="sr-only">
            Search by name or code
          </label>
          <Input id="product-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or product code" className="pl-9" type="search" />
        </div>
        <label className="sm:w-48">
          <span className="sr-only">Sort</span>
          <Select value={params.sort ?? "updated"} onChange={(e) => push({ sort: e.target.value === "updated" ? undefined : e.target.value })}>
            <option value="updated">Recently updated</option>
            <option value="name">Name A–Z</option>
            <option value="code">Product code</option>
          </Select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <label className="min-w-0">
          <span className="sr-only">Status</span>
          <Select value={params.status ?? ""} onChange={(e) => push({ status: e.target.value || undefined })} className="h-9 text-sm">
            <option value="">Status: not archived</option>
            <option value="all">All, incl. archived</option>
            <option value="published">Published</option>
            <option value="review">Needs review</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </Select>
        </label>
        {select("category", "Category", categories)}
        {select("size", "Size", sizes)}
        {select("finish", "Finish", finishes)}
        {select("series", "Collection", series)}
        {select("pdf", "Source PDF", pdfs, [{ value: "none", label: "No source PDF" }])}
      </div>
      {active && (
        <Button variant="ghost" size="sm" icon={<X className="size-3.5" />} onClick={() => startTransition(() => router.push(pathname))}>
          Clear all filters
        </Button>
      )}
    </div>
  );
}
