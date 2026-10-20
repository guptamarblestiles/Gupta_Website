"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Eye, EyeOff, FolderPlus, GitMerge, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@admin/components/ui/Button";
import { Badge, Card, CardHeader, EmptyState, Thumb } from "@admin/components/ui/Display";
import { ConfirmDialog, Dialog } from "@admin/components/ui/Dialog";
import { Checkbox, Field, Input, Textarea } from "@admin/components/ui/Field";
import { useToast } from "@admin/components/ui/Toast";
import { useAction } from "@admin/lib/client/useAction";
import { adoptCategoryLabel, deleteCategory, saveCategory } from "@admin/actions/catalogue";
import { uploadImage } from "@admin/lib/client/uploads";
import { MergeDialog } from "@admin/components/catalogue/MergeDialog";

export type CategoryItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_visible: boolean;
  sort_order: number;
  total: number;
  published: number;
};

export function CategoryManager({
  categories,
  unmanaged,
  allNames,
  canEdit,
  canDelete,
}: {
  categories: CategoryItem[];
  unmanaged: { name: string; total: number; published: number }[];
  allNames: string[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const { run, pending } = useAction();
  const [editing, setEditing] = useState<CategoryItem | "new" | null>(null);
  const [deleting, setDeleting] = useState<CategoryItem | null>(null);
  const [merging, setMerging] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Customer-facing categories"
          description="Name, picture, visibility and order."
          action={
            canEdit && (
              <Button size="sm" variant="primary" icon={<Plus className="size-4" />} onClick={() => setEditing("new")}>
                New category
              </Button>
            )
          }
        />
        {categories.length === 0 ? (
          <EmptyState icon={<FolderPlus className="size-5" />} title="No managed categories yet">
            Create one, or adopt one of the labels your products already use below.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {categories.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <Thumb src={c.image_url} alt="" className="size-11" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{c.name}</span>
                    {c.is_visible ? (
                      c.published ? (
                        <Badge tone="success">
                          <Eye className="size-3" /> On website
                        </Badge>
                      ) : (
                        <Badge tone="neutral">Visible, but no published products</Badge>
                      )
                    ) : (
                      <Badge tone="neutral">
                        <EyeOff className="size-3" /> Hidden
                      </Badge>
                    )}
                  </div>
                  <Link href={`/admin/products?category=${encodeURIComponent(c.name)}`} className="text-xs text-ink-faint hover:text-ink">
                    {c.total} product{c.total === 1 ? "" : "s"} · {c.published} published · order {c.sort_order}
                  </Link>
                </div>
                {canEdit && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" icon={<Pencil className="size-4" />} onClick={() => setEditing(c)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" icon={<GitMerge className="size-4" />} onClick={() => setMerging(c.name)} disabled={!c.total}>
                      Merge
                    </Button>
                    {canDelete && (
                      <Button size="sm" variant="ghost" className="text-danger hover:bg-danger-soft" onClick={() => setDeleting(c)} aria-label={`Delete ${c.name}`}>
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {unmanaged.length > 0 && (
        <Card>
          <CardHeader
            title="Labels used by products but not managed"
            description="These come from imports. Adopt one to give it a picture and order, or merge it into a proper category."
          />
          <ul className="divide-y divide-line">
            {unmanaged.map((u) => (
              <li key={u.name} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{u.name}</span>
                  <Link href={`/admin/products?category=${encodeURIComponent(u.name)}`} className="ml-2 text-xs text-ink-faint hover:text-ink">
                    {u.total} product{u.total === 1 ? "" : "s"} · {u.published} published
                  </Link>
                </div>
                {canEdit && (
                  <div className="flex gap-1">
                    <Button size="sm" onClick={() => run(() => adoptCategoryLabel(u.name))} disabled={pending}>
                      Adopt
                    </Button>
                    <Button size="sm" variant="ghost" icon={<GitMerge className="size-4" />} onClick={() => setMerging(u.name)}>
                      Merge into…
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {editing && <CategoryDialog item={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {merging && <MergeDialog column="category" from={merging} options={allNames.filter((n) => n !== merging)} onClose={() => setMerging(null)} />}
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={`Delete “${deleting?.name}”?`}
        confirmLabel="Delete category"
        busy={pending}
        onConfirm={async () => {
          if (!deleting) return;
          const r = await run(() => deleteCategory(deleting.id));
          if (r) setDeleting(null);
        }}
      >
        {deleting?.total ? (
          <p>
            {deleting.total} product{deleting.total === 1 ? " still uses" : "s still use"} this category, so it can&apos;t be deleted. Move them first, or merge it.
          </p>
        ) : (
          <p>No products use it. Its picture stays in the image library.</p>
        )}
      </ConfirmDialog>
    </div>
  );
}

function CategoryDialog({ item, onClose }: { item: CategoryItem | null; onClose: () => void }) {
  const toast = useToast();
  const { run, pending } = useAction();
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [visible, setVisible] = useState(item?.is_visible ?? true);
  const [order, setOrder] = useState(String(item?.sort_order ?? 0));
  const [image, setImage] = useState(item?.image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  return (
    <Dialog
      open
      onClose={onClose}
      title={item ? `Edit “${item.name}”` : "New category"}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            loading={pending}
            disabled={!name.trim() || uploading}
            onClick={async () => {
              const r = await run(() => saveCategory(item?.id ?? null, { name, description, is_visible: visible, sort_order: Number(order) || 0, image_url: image || null }));
              if (r?.ok) onClose();
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field
          label="Name"
          htmlFor="cat-name"
          hint={item && name !== item.name && item.total ? `Renaming also updates the ${item.total} product${item.total === 1 ? "" : "s"} in this category.` : undefined}
        >
          <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Short description" htmlFor="cat-desc" optional>
          <Textarea id="cat-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Order" htmlFor="cat-order" hint="Lower numbers come first.">
            <Input id="cat-order" inputMode="numeric" value={order} onChange={(e) => setOrder(e.target.value.replace(/\D/g, ""))} />
          </Field>
          <div className="pt-7">
            <Checkbox label="Show on website" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium">Picture</p>
          <div className="flex items-center gap-3">
            <Thumb src={image || null} alt="" className="size-16" />
            <Button
              size="sm"
              icon={<ImagePlus className="size-4" />}
              loading={uploading}
              onClick={() => file.current?.click()}
            >
              {image ? "Replace" : "Upload"}
            </Button>
            {image && (
              <Button size="sm" variant="ghost" onClick={() => setImage("")}>
                Remove
              </Button>
            )}
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
                setImage((await uploadImage(f, "categories")).url);
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
