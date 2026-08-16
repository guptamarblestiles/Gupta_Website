/** Confirm-then-delete button for the admin product table. Uses the
 *  browser's native confirm() rather than a custom modal — acceptable here
 *  since this is an internal single-admin tool, not customer-facing. */
"use client";

import { useTransition } from "react";
import { deleteProductAction } from "@/lib/admin/formActions";

export function DeleteProductButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      className="text-red-400 hover:text-red-300 disabled:opacity-50"
      onClick={() => {
        if (!confirm(`Delete "${name}"? This also deletes its images. This cannot be undone.`)) return;
        startTransition(() => deleteProductAction(id));
      }}
    >
      {isPending ? "Deleting..." : "Delete"}
    </button>
  );
}
