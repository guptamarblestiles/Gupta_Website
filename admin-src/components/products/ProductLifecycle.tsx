"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@admin/components/ui/Button";
import { Card, CardHeader } from "@admin/components/ui/Display";
import { ConfirmDialog } from "@admin/components/ui/Dialog";
import { useAction } from "@admin/lib/client/useAction";
import { deleteProduct, setProductStatus } from "@admin/actions/products";
import type { ProductStatus } from "@admin/lib/catalogue/product";

export function ProductLifecycle({
  id,
  name,
  code,
  status,
  canDelete,
  references,
  imageCount,
}: {
  id: string;
  name: string;
  code: string;
  status: ProductStatus;
  canDelete: boolean;
  references: { enquiries: number; importCandidates: number };
  imageCount: number;
}) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [confirm, setConfirm] = useState<"archive" | "delete" | null>(null);

  return (
    <Card className="mt-6 lg:max-w-[calc(100%-344px)]">
      <CardHeader title="Housekeeping" description="Archiving hides a product but keeps everything, so it can be restored later." />
      <div className="flex flex-wrap gap-3 p-5">
        {status === "archived" ? (
          <Button icon={<RotateCcw className="size-4" />} loading={pending} onClick={() => run(() => setProductStatus([id], "draft"))}>
            Restore as draft
          </Button>
        ) : (
          <Button icon={<Archive className="size-4" />} onClick={() => setConfirm("archive")}>
            Archive
          </Button>
        )}
        {canDelete && (
          <Button variant="ghost" className="text-danger hover:bg-danger-soft hover:text-danger" icon={<Trash2 className="size-4" />} onClick={() => setConfirm("delete")}>
            Delete permanently
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirm === "archive"}
        onClose={() => setConfirm(null)}
        title={`Archive “${name}”?`}
        confirmLabel="Archive"
        tone="primary"
        busy={pending}
        onConfirm={async () => {
          const r = await run(() => setProductStatus([id], "archived"));
          if (r?.ok) setConfirm(null);
        }}
      >
        <p>It will disappear from the website{status === "published" ? " straight away" : ""}. All details and images are kept and you can restore it at any time.</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm === "delete"}
        onClose={() => setConfirm(null)}
        title={`Permanently delete “${name}”?`}
        confirmLabel="Delete forever"
        typeToConfirm={code}
        busy={pending}
        onConfirm={async () => {
          const r = await run(() => deleteProduct(id, code), { refresh: false });
          if (r?.ok) router.replace(`/admin/products?flash=${encodeURIComponent(r.message)}`);
        }}
      >
        <p>This can&apos;t be undone. Consider archiving instead.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            The product record and its {imageCount} image link{imageCount === 1 ? "" : "s"} are removed. The image files stay in the image library.
          </li>
          {references.enquiries > 0 && (
            <li>
              {references.enquiries} customer enquir{references.enquiries === 1 ? "y mentions" : "ies mention"} this product. They are kept, but will no longer link to it.
            </li>
          )}
          {references.importCandidates > 0 && <li>It came from a PDF import; that review item will be unlinked.</li>}
          <li>The source PDF is not affected.</li>
        </ul>
      </ConfirmDialog>
    </Card>
  );
}
