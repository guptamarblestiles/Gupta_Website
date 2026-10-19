"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Archive, CheckCircle2, EyeOff, FileText, FolderInput } from "lucide-react";
import { Badge, StatusBadge, Thumb } from "@/components/ui/Display";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input } from "@/components/ui/Field";
import { useAction } from "@/lib/client/useAction";
import { setProductCategory, setProductStatus } from "@/actions/products";
import type { ProductListRow } from "@/lib/data/products";
import type { ProductStatus } from "@/lib/catalogue/product";
import { cn } from "@/lib/cn";

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

export function ProductTable({ rows, canEdit, categories }: { rows: ProductListRow[]; canEdit: boolean; categories: string[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [moveOpen, setMoveOpen] = useState(false);
  const [category, setCategory] = useState("");
  const { run, pending } = useAction();
  const ids = useMemo(() => [...selected], [selected]);
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const bulkStatus = async (status: ProductStatus) => {
    const r = await run(() => setProductStatus(ids, status));
    if (r?.ok) setSelected(new Set());
  };

  return (
    <>
      {canEdit && selected.size > 0 && (
        <div className="sticky top-14 z-20 flex flex-wrap items-center gap-2 border-y border-copper-ring bg-copper-soft px-4 py-2.5 text-sm">
          <span className="mr-2 font-medium text-copper-strong">{selected.size} selected</span>
          <Button size="sm" onClick={() => bulkStatus("published")} loading={pending} icon={<CheckCircle2 className="size-4" />}>
            Publish
          </Button>
          <Button size="sm" onClick={() => bulkStatus("draft")} disabled={pending} icon={<EyeOff className="size-4" />}>
            Unpublish
          </Button>
          <Button size="sm" onClick={() => bulkStatus("archived")} disabled={pending} icon={<Archive className="size-4" />}>
            Archive
          </Button>
          <Button size="sm" onClick={() => setMoveOpen(true)} disabled={pending} icon={<FolderInput className="size-4" />}>
            Set category
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-muted text-left text-xs font-medium tracking-wide text-ink-faint uppercase">
              {canEdit && (
                <th className="w-10 py-2.5 pl-4">
                  <input
                    type="checkbox"
                    aria-label="Select all on this page"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))}
                    className="size-4 accent-copper"
                  />
                </th>
              )}
              <th className="py-2.5 pl-4 font-medium">Product</th>
              <th className="py-2.5 font-medium">Category</th>
              <th className="py-2.5 font-medium">Size · Finish</th>
              <th className="py-2.5 font-medium">Status</th>
              <th className="py-2.5 font-medium">Source PDF</th>
              <th className="py-2.5 pr-4 text-right font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={cn("border-b border-line last:border-0 hover:bg-surface-muted", selected.has(r.id) && "bg-copper-soft/40")}>
                {canEdit && (
                  <td className="py-2.5 pl-4">
                    <input type="checkbox" aria-label={`Select ${r.name}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="size-4 accent-copper" />
                  </td>
                )}
                <td className="py-2.5 pl-4">
                  <Link href={`/products/${r.id}`} className="flex items-center gap-3">
                    <Thumb src={r.thumbnail} alt="" className="size-11" />
                    <div className="min-w-0">
                      <div className="truncate font-medium text-ink hover:underline">{r.name}</div>
                      <div className="font-mono text-xs text-ink-faint">{r.product_code}</div>
                    </div>
                  </Link>
                </td>
                <td className="py-2.5">
                  <div className="text-ink">{r.category}</div>
                  {(r.series ?? r.collection) && <div className="text-xs text-ink-faint">{r.series ?? r.collection}</div>}
                </td>
                <td className="py-2.5 text-ink-muted">{[r.size, r.finish].filter(Boolean).join(" · ") || "—"}</td>
                <td className="py-2.5">
                  <div className="flex flex-col items-start gap-1">
                    <StatusBadge status={r.status} />
                    {r.image_count === 0 && <Badge tone="danger">No image</Badge>}
                  </div>
                </td>
                <td className="max-w-48 py-2.5">
                  <PdfCell row={r} />
                </td>
                <td className="py-2.5 pr-4 text-right whitespace-nowrap text-ink-faint">{dateFmt.format(new Date(r.updated_at))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y divide-line md:hidden">
        {rows.map((r) => (
          <li key={r.id} className={cn("flex items-start gap-3 px-4 py-3", selected.has(r.id) && "bg-copper-soft/40")}>
            {canEdit && (
              <input type="checkbox" aria-label={`Select ${r.name}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="mt-4 size-5 accent-copper" />
            )}
            <Link href={`/products/${r.id}`} className="flex min-w-0 flex-1 items-start gap-3">
              <Thumb src={r.thumbnail} alt="" className="size-14" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-ink">{r.name}</div>
                <div className="font-mono text-xs text-ink-faint">{r.product_code}</div>
                <div className="mt-1 truncate text-xs text-ink-muted">{[r.category, r.size, r.finish].filter(Boolean).join(" · ")}</div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <StatusBadge status={r.status} />
                  {r.image_count === 0 && <Badge tone="danger">No image</Badge>}
                  {!r.source_pdf_id && <Badge tone="warning">No PDF</Badge>}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <Dialog
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        title={`Set category for ${selected.size} product${selected.size === 1 ? "" : "s"}`}
        size="sm"
        footer={
          <>
            <Button onClick={() => setMoveOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              loading={pending}
              disabled={!category.trim()}
              onClick={async () => {
                const r = await run(() => setProductCategory(ids, category));
                if (r?.ok) {
                  setMoveOpen(false);
                  setSelected(new Set());
                }
              }}
            >
              Apply
            </Button>
          </>
        }
      >
        <Field label="Category" htmlFor="bulk-category" hint="Pick an existing category so the website filter stays tidy, or type a new one.">
          <Input id="bulk-category" list="bulk-category-list" value={category} onChange={(e) => setCategory(e.target.value)} autoFocus />
          <datalist id="bulk-category-list">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
      </Dialog>
    </>
  );
}

function PdfCell({ row }: { row: ProductListRow }) {
  if (!row.source_pdf_id) return <Badge tone="warning">Not linked</Badge>;
  return (
    <div className="flex items-start gap-1.5 text-ink-muted">
      <FileText className="mt-0.5 size-3.5 shrink-0 text-ink-faint" aria-hidden />
      <div className="min-w-0">
        <div className="truncate text-xs">{row.pdf_title}</div>
        <div className="text-xs text-ink-faint">
          {row.source_page ? `Page ${row.source_page}` : "Page not set"}
          {!row.pdf_has_file && " · file missing"}
        </div>
      </div>
    </div>
  );
}
