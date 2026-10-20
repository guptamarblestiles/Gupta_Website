"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Copy, ExternalLink, FileText, Link2, Loader2, Search, Trash2, Upload } from "lucide-react";
import { Button } from "@admin/components/ui/Button";
import { Badge, StatusBadge, Thumb } from "@admin/components/ui/Display";
import { ConfirmDialog, Dialog } from "@admin/components/ui/Dialog";
import { Input } from "@admin/components/ui/Field";
import { useToast } from "@admin/components/ui/Toast";
import { useAction } from "@admin/lib/client/useAction";
import { addImageToProduct, deleteMediaObject, getMediaUsage } from "@admin/actions/media";
import { searchProductsForPicker, type ProductPick } from "@admin/actions/products";
import { uploadImage } from "@admin/lib/client/uploads";
import { ACCEPTED_IMAGE_TYPES } from "@admin/lib/client/files";
import { formatBytes } from "@admin/lib/catalogue/normalize";
import type { MediaObject } from "@admin/lib/data/media";
import type { ProductStatus } from "@admin/lib/catalogue/product";

export function MediaGrid({ items, isOwner, canEdit, pdf }: { items: MediaObject[]; isOwner: boolean; canEdit: boolean; pdf?: boolean }) {
  const [open, setOpen] = useState<MediaObject | null>(null);
  return (
    <>
      <ul className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 lg:grid-cols-6">
        {items.map((m) => {
          const refs = m.product_refs + m.other_refs;
          return (
            <li key={m.name}>
              <button type="button" onClick={() => setOpen(m)} className="group block w-full text-left">
                <div className="relative aspect-square overflow-hidden rounded-lg border border-line bg-sunken group-hover:border-line-strong">
                  {pdf ? (
                    <div className="grid size-full place-items-center text-danger">
                      <FileText className="size-8" />
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.url} alt={m.name} loading="lazy" className="size-full object-cover" />
                  )}
                  <span className="absolute top-1.5 left-1.5">
                    {refs === 0 ? <Badge tone="warning">Unused</Badge> : m.published_refs ? <Badge tone="success">Live</Badge> : <Badge>In use</Badge>}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-ink-muted" title={m.name}>
                  {m.name.split("/").pop()}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
      {open && <MediaDetail item={open} onClose={() => setOpen(null)} isOwner={isOwner} canEdit={canEdit} pdf={pdf} />}
    </>
  );
}

function MediaDetail({ item, onClose, isOwner, canEdit, pdf }: { item: MediaObject; onClose: () => void; isOwner: boolean; canEdit: boolean; pdf?: boolean }) {
  const toast = useToast();
  const { run, pending } = useAction();
  const [usage, setUsage] = useState<{ id: string; name: string; product_code: string; status: string; primary: boolean }[] | null>(null);
  const [assign, setAssign] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const refs = item.product_refs + item.other_refs;

  useEffect(() => {
    getMediaUsage(item.url).then((r) => setUsage(r.ok ? (r.data ?? []) : []));
  }, [item.url]);

  return (
    <Dialog
      open
      onClose={onClose}
      title={item.name.split("/").pop() ?? item.name}
      description={<span className="font-mono text-xs">{item.name}</span>}
      size="lg"
      footer={
        <>
          {isOwner && (
            <Button
              variant="ghost"
              className="mr-auto text-danger hover:bg-danger-soft hover:text-danger"
              icon={<Trash2 className="size-4" />}
              onClick={() => setConfirmDelete(true)}
              disabled={refs > 0}
              title={refs > 0 ? "Still in use" : undefined}
            >
              Delete file
            </Button>
          )}
          {canEdit && !pdf && (
            <Button icon={<Link2 className="size-4" />} onClick={() => setAssign(true)}>
              Add to a product
            </Button>
          )}
          <Button
            icon={<Copy className="size-4" />}
            onClick={() => {
              void navigator.clipboard.writeText(item.url);
              toast({ tone: "success", title: "Link copied." });
            }}
          >
            Copy link
          </Button>
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-[220px_minmax(0,1fr)]">
        {pdf ? (
          <a href={item.url} target="_blank" rel="noreferrer" className="grid aspect-square place-items-center rounded-lg border border-line bg-sunken text-danger">
            <FileText className="size-10" />
          </a>
        ) : (
          <a href={item.url} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.url} alt={item.name} className="aspect-square w-full rounded-lg border border-line bg-sunken object-contain" />
          </a>
        )}
        <div className="space-y-3 text-sm">
          <dl className="grid grid-cols-[110px_1fr] gap-y-1 text-ink-muted">
            <dt>Size</dt>
            <dd className="text-ink">{formatBytes(item.size_bytes)}</dd>
            <dt>Uploaded</dt>
            <dd className="text-ink">{new Date(item.created_at).toLocaleDateString("en-IN")}</dd>
            <dt>Other uses</dt>
            <dd className="text-ink">{item.other_refs ? `${item.other_refs} (category, catalogue, PDF or import)` : "None"}</dd>
          </dl>
          <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-copper-strong hover:underline">
            Open full size <ExternalLink className="size-3.5" />
          </a>
          <div>
            <p className="mb-1.5 font-medium">Used by products</p>
            {usage === null ? (
              <Loader2 className="size-4 animate-spin text-ink-faint" />
            ) : usage.length === 0 ? (
              <p className="text-ink-muted">No products use this file.</p>
            ) : (
              <ul className="space-y-1">
                {usage.map((u) => (
                  <li key={u.id} className="flex items-center gap-2">
                    <Link href={`/admin/products/${u.id}`} className="min-w-0 flex-1 truncate hover:underline">
                      {u.name} <span className="font-mono text-xs text-ink-faint">{u.product_code}</span>
                    </Link>
                    {u.primary && <Badge tone="copper">Main</Badge>}
                    <StatusBadge status={u.status as ProductStatus} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      {assign && (
        <ProductPicker
          onClose={() => setAssign(false)}
          onPick={async (p) => {
            const r = await run(() => addImageToProduct(p.id, item.url));
            if (r?.ok) {
              setAssign(false);
              const u = await getMediaUsage(item.url);
              setUsage(u.ok ? (u.data ?? []) : []);
            }
          }}
          busy={pending}
        />
      )}
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this file permanently?"
        confirmLabel="Delete file"
        busy={pending}
        onConfirm={async () => {
          const r = await run(() => deleteMediaObject(item.url));
          if (r?.ok) onClose();
          setConfirmDelete(false);
        }}
      >
        <p>Nothing on the website uses it. This is checked again at the moment you delete.</p>
      </ConfirmDialog>
    </Dialog>
  );
}

export function ProductPicker({ onClose, onPick, busy }: { onClose: () => void; onPick: (p: ProductPick) => void; busy?: boolean }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<ProductPick[] | null>(null);
  useEffect(() => {
    const t = setTimeout(() => searchProductsForPicker(q).then(setItems), q ? 250 : 0);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <Dialog open onClose={onClose} title="Choose a product" size="md">
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or code" className="pl-9" autoFocus aria-label="Search products" />
      </div>
      {items === null ? (
        <Loader2 className="mx-auto size-5 animate-spin text-ink-faint" />
      ) : (
        <ul className="divide-y divide-line">
          {items.map((p) => (
            <li key={p.id}>
              <button type="button" disabled={busy} onClick={() => onPick(p)} className="flex w-full items-center gap-3 px-1 py-2 text-left hover:bg-admin-surface-muted disabled:opacity-50">
                <Thumb src={p.thumbnail} alt="" className="size-10" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{p.name}</span>
                  <span className="block font-mono text-xs text-ink-faint">{p.product_code}</span>
                </span>
                <StatusBadge status={p.status} />
              </button>
            </li>
          ))}
          {items.length === 0 && <li className="py-6 text-center text-sm text-ink-muted">No products found.</li>}
        </ul>
      )}
    </Dialog>
  );
}

export function MediaUploadButton() {
  const router = useRouter();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  return (
    <>
      <Button variant="primary" icon={<Upload className="size-4" />} loading={busy > 0} onClick={() => input.current?.click()}>
        {busy ? `Uploading ${busy}…` : "Upload images"}
      </Button>
      <input
        ref={input}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        multiple
        hidden
        onChange={async (e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          setBusy(files.length);
          let ok = 0;
          for (const f of files) {
            try {
              const r = await uploadImage(f, "library");
              ok++;
              if (r.reused) toast({ tone: "info", title: `“${f.name}” is already in the library.` });
            } catch (err) {
              toast({ tone: "error", title: err instanceof Error ? err.message : `Couldn't upload ${f.name}` });
            } finally {
              setBusy((n) => n - 1);
            }
          }
          if (ok) toast({ tone: "success", title: `${ok} image${ok === 1 ? "" : "s"} uploaded.`, detail: "Find them under “Unused” until you add them to a product." });
          router.refresh();
        }}
      />
    </>
  );
}
