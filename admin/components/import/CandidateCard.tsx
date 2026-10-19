"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Ban, Check, CheckCircle2, Link2, SkipForward, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Display";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Input, Select } from "@/components/ui/Field";
import { WARNING_TEXT, type WarningCode } from "@/lib/pdf/textHints";
import type { Candidate, CandidateField, CandidateValues } from "@/lib/catalogue/candidate";
import { APPLICATIONS } from "@/lib/catalogue/product";
import { cn } from "@/lib/cn";

const FIELDS: { key: CandidateField; label: string; list?: string; mono?: boolean }[] = [
  { key: "product_code", label: "Product code", mono: true },
  { key: "name", label: "Name" },
  { key: "category", label: "Category", list: "category" },
  { key: "size", label: "Size", list: "size" },
  { key: "finish", label: "Finish", list: "finish" },
  { key: "thickness", label: "Thickness", list: "thickness" },
  { key: "material", label: "Material", list: "material" },
  { key: "series", label: "Collection", list: "series" },
];

export type ApproveChoice = { existingProductId?: string; status: "review" | "draft" };

export function CandidateCard({
  index,
  candidate,
  defaults,
  duplicate,
  selected,
  busy,
  onSelect,
  onSaveValues,
  onApprove,
  onStatus,
  onDelete,
}: {
  index: number;
  candidate: Candidate;
  defaults: CandidateValues & { namePrefix?: string | null };
  duplicate: { id: string; name: string } | null;
  selected: boolean;
  busy: boolean;
  onSelect: () => void;
  onSaveValues: (values: CandidateValues) => void;
  onApprove: (values: CandidateValues, choice: ApproveChoice) => void;
  onStatus: (status: "pending" | "skipped" | "rejected") => void;
  onDelete: () => void;
}) {
  const [values, setValues] = useState<CandidateValues>(candidate.suggested ?? {});
  const [confirmExisting, setConfirmExisting] = useState(false);
  const [prevSuggested, setPrevSuggested] = useState(candidate.suggested);
  if (candidate.suggested !== prevSuggested) {
    setPrevSuggested(candidate.suggested);
    setValues(candidate.suggested ?? {});
  }
  const done = candidate.status === "created";
  const closed = candidate.status === "rejected" || candidate.status === "skipped";
  const warnings = candidate.warnings.filter((w) => w in WARNING_TEXT) as WarningCode[];
  const codeEmpty = !(values.product_code ?? "").trim();

  const placeholder = (key: CandidateField) => {
    if (key === "name" && !values.name && defaults.namePrefix && values.product_code) return `${defaults.namePrefix} ${values.product_code}`;
    const d = defaults[key];
    return d ? `${d} (PDF default)` : "—";
  };

  return (
    <article
      id={`cand-${candidate.id}`}
      onFocusCapture={onSelect}
      onClick={onSelect}
      className={cn(
        "rounded-xl border bg-surface shadow-card transition-colors",
        selected ? "border-copper ring-1 ring-copper" : "border-line",
        (closed || done) && "opacity-80",
      )}
    >
      <div className="flex gap-3 p-3">
        <div className="relative w-28 shrink-0 sm:w-32">
          {candidate.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={candidate.image_url} alt={`Crop ${index + 1} from page ${candidate.page}`} className="aspect-square w-full rounded-lg border border-line bg-sunken object-contain" />
          ) : (
            <div className="aspect-square rounded-lg bg-sunken" />
          )}
          <span className="absolute top-1 left-1 rounded bg-ink/80 px-1.5 py-0.5 text-[11px] font-semibold text-white">{index + 1}</span>
          {candidate.image_width && (
            <p className="mt-1 text-center text-[11px] text-ink-faint">
              {candidate.image_width}×{candidate.image_height}px
            </p>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="neutral">Page {candidate.page}</Badge>
            {done && <Badge tone="success">Product created</Badge>}
            {candidate.status === "skipped" && <Badge tone="neutral">Skipped</Badge>}
            {candidate.status === "rejected" && <Badge tone="danger">Rejected</Badge>}
            {candidate.detection === "manual" && <Badge tone="info">Your crop</Badge>}
          </div>
          {warnings.length > 0 && !done && (
            <ul className="space-y-1">
              {warnings.map((w) => (
                <li key={w} className="flex items-start gap-1.5 text-xs text-warning">
                  <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden />
                  {WARNING_TEXT[w]}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {!done && !closed && (
        <div className="border-t border-line p-3">
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            {FIELDS.map((f) => (
              <label key={f.key} className={cn("min-w-0", f.key === "name" && "col-span-2", f.key === "product_code" && "col-span-2")}>
                <span className="mb-0.5 block text-[11px] font-medium tracking-wide text-ink-faint uppercase">{f.label}</span>
                <Input
                  value={values[f.key] ?? ""}
                  placeholder={placeholder(f.key)}
                  list={f.list ? `dl-${f.list}` : undefined}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  onBlur={() => JSON.stringify(values) !== JSON.stringify(candidate.suggested) && onSaveValues(values)}
                  className={cn("h-9 text-sm", f.mono && "font-mono", f.key === "product_code" && duplicate && "border-warning")}
                  autoComplete="off"
                />
              </label>
            ))}
            <label className="min-w-0">
              <span className="mb-0.5 block text-[11px] font-medium tracking-wide text-ink-faint uppercase">Application</span>
              <Select
                value={values.application ?? ""}
                onChange={(e) => {
                  const next = { ...values, application: e.target.value || null };
                  setValues(next);
                  onSaveValues(next);
                }}
                className="h-9 text-sm"
              >
                <option value="">{defaults.application ? `${defaults.application} (default)` : "—"}</option>
                {APPLICATIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          {duplicate && (
            <div className="mt-3 rounded-lg bg-warning-soft p-3 text-sm text-warning">
              <p>
                Code {values.product_code} already belongs to{" "}
                <Link href={`/products/${duplicate.id}`} target="_blank" className="font-medium underline">
                  {duplicate.name}
                </Link>
                . Change the code, or add this image to that product.
              </p>
              <Button size="sm" className="mt-2" icon={<Link2 className="size-4" />} onClick={() => setConfirmExisting(true)} disabled={busy}>
                Add to “{duplicate.name}”
              </Button>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              icon={<Check className="size-4" />}
              disabled={busy || Boolean(duplicate) || codeEmpty}
              title={codeEmpty ? "Enter the product code first" : undefined}
              onClick={() => onApprove(values, { status: "review" })}
            >
              Create product
            </Button>
            <Button size="sm" icon={<SkipForward className="size-4" />} onClick={() => onStatus("skipped")} disabled={busy}>
              Skip
            </Button>
            <Button size="sm" variant="ghost" icon={<Ban className="size-4" />} onClick={() => onStatus("rejected")} disabled={busy}>
              Not a tile
            </Button>
            {candidate.detection === "manual" && (
              <Button size="sm" variant="ghost" icon={<Trash2 className="size-4" />} onClick={onDelete} disabled={busy} aria-label="Remove this crop" />
            )}
          </div>
        </div>
      )}

      {done && candidate.product_id && (
        <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2.5 text-sm">
          <span className="flex items-center gap-1.5 text-success">
            <CheckCircle2 className="size-4" /> In the catalogue as a draft for review
          </span>
          <Link href={`/products/${candidate.product_id}`} className="font-medium text-copper-strong hover:underline">
            Open
          </Link>
        </div>
      )}
      {closed && (
        <div className="flex justify-end border-t border-line px-3 py-2">
          <Button size="sm" variant="ghost" icon={<Undo2 className="size-4" />} onClick={() => onStatus("pending")} disabled={busy}>
            Undo
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmExisting}
        onClose={() => setConfirmExisting(false)}
        title={`Add to “${duplicate?.name}”?`}
        confirmLabel="Yes, add to this product"
        tone="primary"
        busy={busy}
        onConfirm={() => {
          if (duplicate) onApprove(values, { status: "review", existingProductId: duplicate.id });
          setConfirmExisting(false);
        }}
      >
        <p>This crop is added as an extra image, and the product is linked to this PDF page if it isn&apos;t linked yet.</p>
        <p>Only empty fields on the existing product are filled in. Nothing already there is overwritten.</p>
      </ConfirmDialog>
    </article>
  );
}
