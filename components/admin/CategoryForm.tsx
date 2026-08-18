"use client";

import { useActionState } from "react";
import type { AdminCategoryRow } from "@/lib/admin/categories";
import {
  createCategoryAction,
  updateCategoryAction,
  type CategoryFormResult,
} from "@/lib/admin/categoryFormActions";

export function CategoryForm({ category }: { category?: AdminCategoryRow }) {
  const action = category ? updateCategoryAction.bind(null, category.id) : createCategoryAction;
  const [state, formAction, isPending] = useActionState<CategoryFormResult, FormData>(action, undefined);

  return (
    <form action={formAction} encType="multipart/form-data" className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm text-neutral-400">
          Name *
        </label>
        <input
          id="name"
          name="name"
          defaultValue={category?.name}
          required
          className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="slug" className="text-sm text-neutral-400">
          Slug (auto-generated if left blank)
        </label>
        <input
          id="slug"
          name="slug"
          defaultValue={category?.slug}
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
          defaultValue={category?.description ?? ""}
          className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="image" className="text-sm text-neutral-400">
          Category image {category?.image_url && "(uploading replaces the current image)"}
        </label>
        <input
          id="image"
          name="image"
          type="file"
          accept="image/*"
          className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
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
            defaultValue={category?.sort_order ?? 0}
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-neutral-400">
          <input
            type="checkbox"
            name="is_visible"
            defaultChecked={category?.is_visible ?? true}
            className="h-4 w-4"
          />
          Visible on site (still requires at least one product)
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
        {isPending ? "Saving..." : category ? "Save changes" : "Create category"}
      </button>
    </form>
  );
}
