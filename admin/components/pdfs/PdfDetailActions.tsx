"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Archive, CheckCircle2, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Display";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { useAction } from "@/lib/client/useAction";
import { deletePdf, setPdfArchived, setPdfImportStatus, updatePdfDetails } from "@/actions/pdfs";

export function PdfDetailActions({
  id,
  title,
  description,
  archived,
  canDelete,
  productCount,
  importStatus,
}: {
  id: string;
  title: string;
  description: string;
  archived: boolean;
  canDelete: boolean;
  productCount: number;
  importStatus: string;
}) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [t, setT] = useState(title);
  const [d, setD] = useState(description);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dirty = t !== title || d !== description;

  return (
    <>
      <Card>
        <CardHeader title="Details" description="Renaming changes only the title shown, never the stored file." />
        <form
          className="space-y-4 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => updatePdfDetails(id, t, d));
          }}
        >
          <Field label="Title" htmlFor="pdf-t">
            <Input id="pdf-t" value={t} onChange={(e) => setT(e.target.value)} />
          </Field>
          <Field label="Notes" htmlFor="pdf-d" optional>
            <Textarea id="pdf-d" value={d} onChange={(e) => setD(e.target.value)} rows={3} />
          </Field>
          <Button type="submit" variant="primary" size="sm" disabled={!dirty || !t.trim()} loading={pending}>
            Save
          </Button>
        </form>
      </Card>
      <Card>
        <CardHeader title="Housekeeping" />
        <div className="flex flex-col items-start gap-2 p-5">
          {importStatus !== "reviewed" ? (
            <Button size="sm" icon={<CheckCircle2 className="size-4" />} onClick={() => run(() => setPdfImportStatus(id, "reviewed"))} disabled={pending}>
              Mark import as fully reviewed
            </Button>
          ) : (
            <Button size="sm" icon={<RotateCcw className="size-4" />} onClick={() => run(() => setPdfImportStatus(id, "in_progress"))} disabled={pending}>
              Reopen import
            </Button>
          )}
          <Button size="sm" icon={archived ? <RotateCcw className="size-4" /> : <Archive className="size-4" />} onClick={() => run(() => setPdfArchived(id, !archived))} disabled={pending}>
            {archived ? "Restore to library" : "Archive"}
          </Button>
          {canDelete && (
            <Button
              size="sm"
              variant="ghost"
              className="text-danger hover:bg-danger-soft hover:text-danger"
              icon={<Trash2 className="size-4" />}
              onClick={() => setConfirmDelete(true)}
              disabled={productCount > 0}
              title={productCount > 0 ? "Products still link to this PDF" : undefined}
            >
              Delete permanently
            </Button>
          )}
          {canDelete && productCount > 0 && <p className="text-xs text-ink-faint">Can&apos;t delete while {productCount} product{productCount === 1 ? " links" : "s link"} to it. Archive instead.</p>}
        </div>
      </Card>
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this PDF?"
        confirmLabel="Delete PDF"
        typeToConfirm="DELETE"
        busy={pending}
        onConfirm={async () => {
          const r = await run(() => deletePdf(id), { refresh: false });
          if (r?.ok) router.replace(`/pdfs?flash=${encodeURIComponent(r.message)}`);
        }}
      >
        <p>The stored file and any tiles found in it that weren&apos;t turned into products are removed. Products are never affected.</p>
      </ConfirmDialog>
    </>
  );
}
