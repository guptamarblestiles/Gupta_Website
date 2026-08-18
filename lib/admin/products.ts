"use server";

/**
 * Admin CRUD for products/product_images, using the service-role client
 * (bypasses RLS — every caller here runs behind proxy.ts's session check).
 * Row shape intentionally does NOT reuse types/product.ts's camelCase
 * Product type: the admin form edits raw nullable text columns directly
 * (category/finish/etc have no enum constraint anymore, per the fresh
 * schema in supabase/migrations/20260816154500_rebuild_catalogue_schema.sql),
 * where the public catalogue's Product type still assumes non-null values.
 */
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type AdminProductRow = {
  id: string;
  slug: string;
  name: string;
  product_code: string;
  category: string;
  finish: string | null;
  size: string | null;
  color: string | null;
  wall_or_floor: string | null;
  collection: string | null;
  price: number | null;
  price_unit: string | null;
  price_note: string | null;
  description: string;
  created_at: string;
  updated_at: string;
};

export type AdminProductImageRow = {
  id: string;
  product_id: string;
  image_url: string;
  sort_order: number;
};

export async function listProducts(search?: string): Promise<AdminProductRow[]> {
  const client = getSupabaseAdminClient();
  let query = client.from("products").select("*").order("created_at", { ascending: false });
  if (search?.trim()) {
    const term = search.trim().replace(/[,()]/g, " ");
    query = query.or(`name.ilike.%${term}%,product_code.ilike.%${term}%,category.ilike.%${term}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getProductForEdit(id: string) {
  const client = getSupabaseAdminClient();
  const { data: product, error } = await client.from("products").select("*").eq("id", id).single();
  if (error) throw error;

  const { data: images, error: imgError } = await client
    .from("product_images")
    .select("*")
    .eq("product_id", id)
    .order("sort_order", { ascending: true });
  if (imgError) throw imgError;

  return { product: product as AdminProductRow, images: (images ?? []) as AdminProductImageRow[] };
}

export type ProductInput = {
  slug: string;
  name: string;
  product_code: string;
  category: string;
  finish?: string;
  size?: string;
  color?: string;
  wall_or_floor?: string;
  collection?: string;
  price?: number | null;
  price_unit?: string | null;
  price_note?: string | null;
  description?: string;
};

export async function createProduct(input: ProductInput): Promise<string> {
  const client = getSupabaseAdminClient();
  const { data, error } = await client.from("products").insert(input).select("id").single();
  if (error) throw error;
  revalidatePath("/admin");
  revalidatePath("/products");
  return data.id;
}

export async function updateProduct(id: string, input: ProductInput): Promise<void> {
  const client = getSupabaseAdminClient();
  const { error } = await client.from("products").update(input).eq("id", id);
  if (error) throw error;
  revalidatePath("/admin");
  revalidatePath("/products");
  revalidatePath(`/products/${input.slug}`);
}

export async function deleteProduct(id: string): Promise<void> {
  const client = getSupabaseAdminClient();
  // product_images rows cascade-delete via the FK; storage objects for this
  // product are orphaned intentionally (Storage isn't in the same
  // transaction as the delete) — a future cleanup job can sweep them.
  const { error } = await client.from("products").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/admin");
  revalidatePath("/products");
}

/** Max 5 enforced here (server side) in addition to the admin UI's own check. */
export async function addProductImage(productId: string, imageUrl: string, sortOrder: number) {
  const client = getSupabaseAdminClient();
  const { count } = await client
    .from("product_images")
    .select("*", { count: "exact", head: true })
    .eq("product_id", productId);
  if ((count ?? 0) >= 5) throw new Error("A product can have at most 5 images.");

  const { error } = await client
    .from("product_images")
    .insert({ product_id: productId, image_url: imageUrl, sort_order: sortOrder });
  if (error) throw error;
  revalidatePath("/admin");
}

export async function deleteProductImage(imageId: string, productId: string) {
  const client = getSupabaseAdminClient();
  const { error } = await client.from("product_images").delete().eq("id", imageId);
  if (error) throw error;
  revalidatePath("/admin");
  revalidatePath(`/admin/products/${productId}`);
}

export async function reorderProductImages(updates: { id: string; sort_order: number }[]) {
  const client = getSupabaseAdminClient();
  await Promise.all(
    updates.map((u) => client.from("product_images").update({ sort_order: u.sort_order }).eq("id", u.id)),
  );
}

export async function getDistinctCategories(): Promise<string[]> {
  const client = getSupabaseAdminClient();
  const { data, error } = await client.from("products").select("category");
  if (error) throw error;
  return [...new Set((data ?? []).map((r) => r.category as string))].sort();
}
