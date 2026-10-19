"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, BookOpen, ExternalLink, Eye, EyeOff, ImagePlus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge, Card, CardHeader, EmptyState, Thumb } from "@/components/ui/Display";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useAction } from "@/lib/client/useAction";
import { addCatalogueFromLibrary, removeCatalogue, reorderCatalogues, updateCatalogue } from "@/actions/homepage";
import { uploadImage } from "@/lib/client/uploads";

type Row = {
  id: string;
  title: string;
  description: string | null;
  pdf_url: string;
  thumbnail_url: string | null;
  is_visible: boolean;
  sort_order: number;
  source_pdf_id: string | null;
};

export function HomepageCatalogues({ rows, available, canEdit }: { rows: Row[]; available: { id: string; title: string }[]; canEdit: boolean }) {
  const { run, pending } = useAction();
  const [order, setOrder] = useState(rows.map((r) => r.id));
  const [prevRows, setPrevRows] = useState(rows);
  if (rows !== prevRows) {
    // Server sent fresh rows (after a save): adopt their order.
    setPrevRows(rows);
    setOrder(rows.map((r) => r.id));
  }
  const [adding, setAdding] = useState(false);
  const [pick, setPick] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [removing, setRemoving] = useState<Row | null>(null);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const changed = order.join() !== rows.map((r) => r.id).join();

  const move = (i: number, d: number) => {
    const next = [...order];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    setOrder(next);
  };

  return (
    <Card>
      <CardHeader
        title="Shown on the homepage"
        description="Hidden ones stay listed here but customers don't see them."
        action={
          canEdit && (
            <div className="flex gap-2">
              {changed && (
                <Button size="sm" variant="primary" loading={pending} onClick={() => run(() => reorderCatalogues(order))}>
                  Save order
                </Button>
              )}
              <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setAdding(true)} disabled={!available.length}>
                Add from library
              </Button>
            </div>
          )
        }
      />
      {order.length === 0 ? (
        <EmptyState icon={<BookOpen className="size-5" />} title="No catalogues on the homepage">
          The homepage hides the section until at least one visible catalogue is added.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line">
          {order.map((id, i) => {
            const r = byId.get(id)!;
            return (
              <li key={id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <Thumb src={r.thumbnail_url} alt="" className="h-14 w-11" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.title}</span>
                    {r.is_visible ? (
                      <Badge tone="success">
                        <Eye className="size-3" /> Visible
                      </Badge>
                    ) : (
                      <Badge>
                        <EyeOff className="size-3" /> Hidden
                      </Badge>
                    )}
                    {!r.source_pdf_id && <Badge tone="neutral">Uploaded separately</Badge>}
                  </div>
                  {r.description && <p className="truncate text-xs text-ink-faint">{r.description}</p>}
                </div>
                <a href={r.pdf_url} target="_blank" rel="noreferrer" className="text-ink-faint hover:text-ink" aria-label={`Open ${r.title}`}>
                  <ExternalLink className="size-4" />
                </a>
                {canEdit && (
                  <div className="flex gap-0.5">
                    <Button size="sm" variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button size="sm" variant="ghost" aria-label="Move down" disabled={i === order.length - 1} onClick={() => move(i, 1)}>
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="text-danger hover:bg-danger-soft" aria-label={`Remove ${r.title}`} onClick={() => setRemoving(r)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Add a catalogue to the homepage"
        size="sm"
        footer={
          <>
            <Button onClick={() => setAdding(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!pick}
              loading={pending}
              onClick={async () => {
                const r = await run(() => addCatalogueFromLibrary(pick));
                if (r?.ok) {
                  setAdding(false);
                  setPick("");
                }
              }}
            >
              Add
            </Button>
          </>
        }
      >
        <Field label="PDF from the library" htmlFor="add-pdf" hint="Upload new PDFs in the PDF library first.">
          <Select id="add-pdf" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Choose…</option>
            {available.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </Select>
        </Field>
      </Dialog>

      {editing && <EditDialog row={editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title={`Remove “${removing?.title}” from the homepage?`}
        confirmLabel="Remove"
        tone="primary"
        busy={pending}
        onConfirm={async () => {
          if (!removing) return;
          const r = await run(() => removeCatalogue(removing.id));
          if (r?.ok) setRemoving(null);
        }}
      >
        <p>Only the homepage listing is removed. The PDF file and its library entry are kept.</p>
      </ConfirmDialog>
    </Card>
  );
}

function EditDialog({ row, onClose }: { row: Row; onClose: () => void }) {
  const toast = useToast();
  const { run, pending } = useAction();
  const [title, setTitle] = useState(row.title);
  const [description, setDescription] = useState(row.description ?? "");
  const [visible, setVisible] = useState(row.is_visible);
  const [thumb, setThumb] = useState(row.thumbnail_url ?? "");
  const [uploading, setUploading] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  return (
    <Dialog
      open
      onClose={onClose}
      title="Edit homepage catalogue"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            loading={pending}
            disabled={!title.trim() || uploading}
            onClick={async () => {
              const r = await run(() => updateCatalogue(row.id, { title, description, is_visible: visible, thumbnail_url: thumb || null }));
              if (r?.ok) onClose();
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title" htmlFor="hc-title">
          <Input id="hc-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Short description" htmlFor="hc-desc" optional>
          <Textarea id="hc-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </Field>
        <Field label="Visibility" htmlFor="hc-vis">
          <Select id="hc-vis" value={visible ? "1" : "0"} onChange={(e) => setVisible(e.target.value === "1")}>
            <option value="1">Show on the homepage</option>
            <option value="0">Hide</option>
          </Select>
        </Field>
        <div>
          <p className="mb-1.5 text-sm font-medium">Cover picture</p>
          <div className="flex items-center gap-3">
            <Thumb src={thumb || null} alt="" className="h-20 w-16" />
            <Button size="sm" icon={<ImagePlus className="size-4" />} loading={uploading} onClick={() => file.current?.click()}>
              {thumb ? "Replace" : "Upload"}
            </Button>
          </div>
          <input
            ref={file}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setUploading(true);
              try {
                setThumb((await uploadImage(f, "catalogue-covers")).url);
              } catch (err) {
                toast({ tone: "error", title: err instanceof Error ? err.message : "Upload failed" });
              } finally {
                setUploading(false);
              }
            }}
          />
        </div>
      </div>
    </Dialog>
  );
}
