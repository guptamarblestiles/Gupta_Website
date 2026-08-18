"use client";

import { useTransition } from "react";
import { deleteCatalogueAction } from "@/lib/admin/catalogueFormActions";

export function DeleteCatalogueButton({ id, title }: { id: string; title: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      className="text-red-400 hover:text-red-300 disabled:opacity-50"
      onClick={() => {
        if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
        startTransition(() => deleteCatalogueAction(id));
      }}
    >
      {isPending ? "Deleting..." : "Delete"}
    </button>
  );
}
