"use client";

import { useActionState } from "react";
import type { AdminCatalogueRow } from "@/lib/admin/catalogues";
import type { AdminCategoryRow } from "@/lib/admin/categories";
import {
  createCatalogueAction,
  updateCatalogueAction,
  type CatalogueFormResult,
} from "@/lib/admin/catalogueFormActions";

export function CatalogueForm({
  catalogue,
  categories,
}: {
  catalogue?: AdminCatalogueRow;
  categories: AdminCategoryRow[];
}) {
  const action = catalogue ? updateCatalogueAction.bind(null, catalogue.id) : createCatalogueAction;
  const [state, formAction, isPending] = useActionState<CatalogueFormResult, FormData>(action, undefined);

  return (
    <form action={formAction} encType="multipart/form-data" className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="title" className="text-sm text-neutral-400">
          Title *
        </label>
        <input
          id="title"
          name="title"
          defaultValue={catalogue?.title}
          required
          className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="description" className="text-sm text-neutral-400">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={catalogue?.description ?? ""}
          className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="category_id" className="text-sm text-neutral-400">
          Category (optional)
        </label>
        <select
          id="category_id"
          name="category_id"
          defaultValue={catalogue?.category_id ?? ""}
          className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        >
          <option value="">None</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="pdf" className="text-sm text-neutral-400">
          PDF file {catalogue && "(uploading replaces the current PDF)"}
          {!catalogue && " *"}
        </label>
        <input
          id="pdf"
          name="pdf"
          type="file"
          accept="application/pdf"
          required={!catalogue}
          className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        {catalogue && (
          <p className="text-xs text-neutral-500">
            Current file:{" "}
            <a href={catalogue.pdf_url} target="_blank" rel="noreferrer" className="underline">
              view PDF
            </a>
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="sort_order" className="text-sm text-neutral-400">
            Sort order
          </label>
          <input
            id="sort_order"
            name="sort_order"
            type="number"
            defaultValue={catalogue?.sort_order ?? 0}
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-neutral-400">
          <input
            type="checkbox"
            name="is_visible"
            defaultChecked={catalogue?.is_visible ?? true}
            className="h-4 w-4"
          />
          Visible on site
        </label>
      </div>

      {state?.status === "error" && (
        <p className="text-sm text-red-400" role="alert">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-white px-6 py-2 text-sm font-medium text-neutral-950 disabled:opacity-50"
      >
        {isPending ? "Saving..." : catalogue ? "Save changes" : "Upload catalogue"}
      </button>
    </form>
  );
}
