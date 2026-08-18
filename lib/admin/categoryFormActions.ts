"use server";

import { redirect } from "next/navigation";
import {
  createCategory,
  updateCategory,
  deleteCategory as deleteCategoryRow,
  type CategoryInput,
} from "@/lib/admin/categories";
import { slugify } from "@/lib/admin/slugify";

export type CategoryFormResult = { status: "error"; message: string } | void;

function readCategoryInput(formData: FormData): CategoryInput {
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  return {
    name,
    slug: slugInput || slugify(name),
    description: description || null,
    is_visible: formData.get("is_visible") === "on",
    sort_order: Number(formData.get("sort_order") ?? 0) || 0,
  };
}

export async function createCategoryAction(
  _prev: CategoryFormResult,
  formData: FormData,
): Promise<CategoryFormResult> {
  const input = readCategoryInput(formData);
  if (!input.name) return { status: "error", message: "Category name is required." };

  const image = formData.get("image");
  const imageFile = image instanceof File ? image : null;

  try {
    await createCategory(input, imageFile);
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Failed to create category." };
  }
  redirect("/admin/categories");
}

export async function updateCategoryAction(
  id: string,
  _prev: CategoryFormResult,
  formData: FormData,
): Promise<CategoryFormResult> {
  const input = readCategoryInput(formData);
  if (!input.name) return { status: "error", message: "Category name is required." };

  const image = formData.get("image");
  const imageFile = image instanceof File ? image : null;

  try {
    await updateCategory(id, input, imageFile);
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Failed to update category." };
  }
  redirect("/admin/categories");
}

export async function deleteCategoryAction(id: string) {
  await deleteCategoryRow(id);
}
