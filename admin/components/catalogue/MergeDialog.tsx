"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Display";
import { useAction } from "@/lib/client/useAction";
import { previewRename, renameFilterValue, type FilterColumn } from "@/actions/catalogue";

/**
 * Reviewed rename/merge of one filter value. Shows exactly how many
 * products (and how many live ones) change before anything is written.
 */
export function MergeDialog({
  column,
  from,
  options,
  suggestion,
  onClose,
}: {
  column: FilterColumn;
  from: string;
  options: string[];
  suggestion?: string;
  onClose: () => void;
}) {
  const { run, pending } = useAction();
  const [to, setTo] = useState(suggestion ?? "");
  const [impact, setImpact] = useState<{ total: number; published: number } | null>(null);
  useEffect(() => {
    previewRename(column, from).then((r) => r.ok && setImpact(r.data ?? null));
  }, [column, from]);
  const merging = options.includes(to.trim());

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Rename or merge “${from}”`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            loading={pending}
            disabled={!to.trim() || to.trim() === from}
            onClick={async () => {
              const r = await run(() => renameFilterValue(column, from, to));
              if (r?.ok) onClose();
            }}
          >
            {merging ? "Merge" : "Rename"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Change it to" htmlFor="merge-to" hint="Type a new name, or pick an existing value to merge into it.">
          <Input id="merge-to" list="merge-options" value={to} onChange={(e) => setTo(e.target.value)} autoFocus />
          <datalist id="merge-options">
            {options.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </Field>
        {to.trim() && to.trim() !== from && (
          <div className="flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 text-sm">
            <span className="rounded bg-sunken px-2 py-0.5">{from}</span>
            <ArrowRight className="size-4 text-ink-faint" />
            <span className="rounded bg-copper-soft px-2 py-0.5 text-copper-strong">{to.trim()}</span>
            {merging && <span className="ml-auto text-xs text-ink-faint">merge into existing</span>}
          </div>
        )}
        {impact ? (
          <Notice tone={impact.published ? "warning" : "info"}>
            This changes the label on <strong>{impact.total}</strong> product{impact.total === 1 ? "" : "s"}
            {impact.published ? (
              <>
                , <strong>{impact.published}</strong> of them live on the website
              </>
            ) : null}
            . The products themselves stay separate — only this {column === "series" ? "collection" : column} label changes.
          </Notice>
        ) : (
          <Loader2 className="size-4 animate-spin text-ink-faint" />
        )}
      </div>
    </Dialog>
  );
}
