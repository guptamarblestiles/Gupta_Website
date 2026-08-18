"use client";

import { useTransition } from "react";
import { deleteCategoryAction } from "@/lib/admin/categoryFormActions";

export function DeleteCategoryButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      className="text-red-400 hover:text-red-300 disabled:opacity-50"
      onClick={() => {
        if (!confirm(`Delete category "${name}"? This only works if no products use it.`)) return;
        startTransition(() => deleteCategoryAction(id));
      }}
    >
      {isPending ? "Deleting..." : "Delete"}
    </button>
  );
}
