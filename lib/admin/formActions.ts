"use server";

/** Thin server-action wrappers around lib/admin/products.ts so client
 *  components can call a plain async function without importing the
 *  service-role client module directly into the client bundle. */
import { redirect } from "next/navigation";
import {
  createProduct,
  updateProduct,
  deleteProduct as deleteProductRow,
  deleteProductImage as deleteProductImageRow,
  reorderProductImages,
  type ProductInput,
} from "@/lib/admin/products";
import { uploadProductImages } from "@/lib/admin/imageUpload";

export async function deleteProductAction(id: string) {
  await deleteProductRow(id);
}

export async function deleteProductImageAction(imageId: string, productId: string) {
  await deleteProductImageRow(imageId, productId);
}

export type ProductFormResult = { status: "error"; message: string } | void;

function readProductInput(formData: FormData): ProductInput {
  const str = (key: string) => {
    const v = formData.get(key);
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  };
  return {
    slug: str("slug") ?? "",
    name: str("name") ?? "",
    product_code: str("product_code") ?? "",
    category: str("category") ?? "",
    finish: str("finish"),
    size: str("size"),
    color: str("color"),
    wall_or_floor: str("wall_or_floor"),
    collection: str("collection"),
    description: str("description") ?? "",
  };
}

export async function createProductAction(
  _prev: ProductFormResult,
  formData: FormData,
): Promise<ProductFormResult> {
  const input = readProductInput(formData);
  if (!input.slug || !input.name || !input.product_code || !input.category) {
    return { status: "error", message: "Slug, name, product code, and category are required." };
  }
  let id: string;
  try {
    id = await createProduct(input);
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Failed to create product." };
  }
  redirect(`/admin/products/${id}`);
}

export async function updateProductAction(
  id: string,
  _prev: ProductFormResult,
  formData: FormData,
): Promise<ProductFormResult> {
  const input = readProductInput(formData);
  if (!input.slug || !input.name || !input.product_code || !input.category) {
    return { status: "error", message: "Slug, name, product code, and category are required." };
  }
  try {
    await updateProduct(id, input);
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Failed to update product." };
  }
  return undefined;
}

export async function uploadProductImagesAction(productId: string, slug: string, formData: FormData) {
  await uploadProductImages(productId, slug, formData);
}

export async function reorderProductImagesAction(updates: { id: string; sort_order: number }[]) {
  await reorderProductImages(updates);
}
