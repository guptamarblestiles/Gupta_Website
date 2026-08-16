/** Create/edit form for a product's core fields. Slug/name/code/category
 *  are required; everything else is a free-text filter facet (no enum
 *  constraint in the new schema — real taxonomy gets tuned via the import
 *  vocab config, not a DB check constraint). */
"use client";

import { useActionState } from "react";
import type { AdminProductRow } from "@/lib/admin/products";
import { createProductAction, updateProductAction, type ProductFormResult } from "@/lib/admin/formActions";

function Field({
  label,
  name,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="text-sm text-neutral-400">
        {label}
        {required && " *"}
      </label>
      <input
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
      />
    </div>
  );
}

export function ProductForm({ product }: { product?: AdminProductRow }) {
  const action = product
    ? updateProductAction.bind(null, product.id)
    : createProductAction;
  const [state, formAction, isPending] = useActionState<ProductFormResult, FormData>(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Name" name="name" defaultValue={product?.name} required />
        <Field label="Slug" name="slug" defaultValue={product?.slug} required />
        <Field label="Product code" name="product_code" defaultValue={product?.product_code} required />
        <Field label="Category" name="category" defaultValue={product?.category} required />
        <Field label="Finish" name="finish" defaultValue={product?.finish} />
        <Field label="Size" name="size" defaultValue={product?.size} />
        <Field label="Color" name="color" defaultValue={product?.color} />
        <Field label="Wall / Floor" name="wall_or_floor" defaultValue={product?.wall_or_floor} />
        <Field label="Collection" name="collection" defaultValue={product?.collection} />
      </div>
      <div className="space-y-1">
        <label htmlFor="description" className="text-sm text-neutral-400">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={product?.description}
          className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
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
        {isPending ? "Saving..." : product ? "Save changes" : "Create product"}
      </button>
    </form>
  );
}
