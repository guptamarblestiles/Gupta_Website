"use client";

import Link from "next/link";
import { useState } from "react";
import { GitMerge, Lightbulb, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge, Card, CardHeader } from "@/components/ui/Display";
import { MergeDialog } from "@/components/catalogue/MergeDialog";
import { findNearDuplicates } from "@/lib/catalogue/normalize";
import type { FilterColumn } from "@/actions/catalogue";

type Value = { value: string; total: number; published: number };
type Group = { key: string; label: string; missingParam: string | null; values: Value[]; missingPublished: number | null };

export function FilterManager({ groups, canEdit }: { groups: Group[]; canEdit: boolean }) {
  const [merge, setMerge] = useState<{ column: FilterColumn; from: string; options: string[]; suggestion?: string } | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {groups.map((g) => {
        const dupes = findNearDuplicates(g.values.map((v) => v.value));
        const byValue = new Map(g.values.map((v) => [v.value, v]));
        const filterParam = g.key === "series" ? "series" : g.key;
        const linkable = ["series", "size", "finish"].includes(g.key);
        return (
          <Card key={g.key} className="flex flex-col">
            <CardHeader
              title={g.label}
              description={`${g.values.length} value${g.values.length === 1 ? "" : "s"}`}
              action={
                g.missingPublished && g.missingParam ? (
                  <Link href={`/products?status=published&missing=${g.missingParam}`} className="text-xs text-ink-faint hover:text-ink">
                    {g.missingPublished} live product{g.missingPublished === 1 ? "" : "s"} without one
                  </Link>
                ) : null
              }
            />
            {dupes.length > 0 && (
              <div className="space-y-1.5 border-b border-line bg-warning-soft/50 px-5 py-3">
                {dupes.map((d) => {
                  // Suggest keeping the most-used spelling.
                  const ranked = [...d.values].sort((a, b) => (byValue.get(b)?.total ?? 0) - (byValue.get(a)?.total ?? 0));
                  return (
                    <div key={d.key} className="flex flex-wrap items-center gap-2 text-sm">
                      <Lightbulb className="size-4 text-warning" aria-hidden />
                      <span className="text-ink-muted">Possibly the same:</span>
                      {d.values.map((v) => (
                        <Badge key={v}>{v}</Badge>
                      ))}
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<GitMerge className="size-4" />}
                          onClick={() =>
                            setMerge({ column: g.key as FilterColumn, from: ranked[ranked.length - 1], options: g.values.map((v) => v.value), suggestion: ranked[0] })
                          }
                        >
                          Review merge
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {g.values.length === 0 ? (
              <p className="px-5 py-6 text-sm text-ink-muted">No products have a value here yet.</p>
            ) : (
              <ul className="max-h-80 divide-y divide-line overflow-y-auto">
                {g.values.map((v) => (
                  <li key={v.value} className="flex items-center gap-3 px-5 py-2">
                    <div className="min-w-0 flex-1">
                      {linkable ? (
                        <Link href={`/products?${filterParam}=${encodeURIComponent(v.value)}`} className="truncate text-sm hover:underline">
                          {v.value}
                        </Link>
                      ) : (
                        <span className="truncate text-sm">{v.value}</span>
                      )}
                    </div>
                    <span className="text-xs whitespace-nowrap text-ink-faint tabular-nums">
                      {v.published} live / {v.total}
                    </span>
                    {v.published === 0 && <Badge tone="neutral">Not on site</Badge>}
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Rename or merge ${v.value}`}
                        onClick={() => setMerge({ column: g.key as FilterColumn, from: v.value, options: g.values.map((x) => x.value).filter((x) => x !== v.value) })}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}
      {merge && <MergeDialog {...merge} options={merge.options.filter((o) => o !== merge.from)} onClose={() => setMerge(null)} />}
    </div>
  );
}
