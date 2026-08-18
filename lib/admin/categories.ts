"use server";

/** Admin CRUD for the categories table. Category images reuse the same
 *  "tiles" storage bucket / WebP pipeline as product images (toWebp in
 *  lib/admin/imageUpload.ts) rather than a second bucket, since they're
 *  the same kind of asset (a curated photo) just attached to a category
 *  row instead of a product row. */
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { toWebp } from "@/lib/admin/imageUpload";
import { STORAGE_BUCKET } from "@/lib/admin/imageConfig";

export type AdminCategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type CategoryWithCount = AdminCategoryRow & { product_count: number };

export async function listCategoriesWithCounts(): Promise<CategoryWithCount[]> {
  const client = getSupabaseAdminClient();
  const { data: categories, error } = await client
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;

  const { data: products, error: prodError } = await client.from("products").select("category");
  if (prodError) throw prodError;

  const counts = new Map<string, number>();
  for (const row of products ?? []) {
    const name = row.category as string;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return (categories ?? []).map((c) => ({ ...c, product_count: counts.get(c.name) ?? 0 }));
}

export async function getCategoryForEdit(id: string): Promise<AdminCategoryRow> {
  const client = getSupabaseAdminClient();
  const { data, error } = await client.from("categories").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export type CategoryInput = {
  name: string;
  slug: string;
  description?: string | null;
  is_visible: boolean;
  sort_order: number;
};

export async function createCategory(input: CategoryInput, imageFile?: File | null): Promise<string> {
  const client = getSupabaseAdminClient();
  let image_url: string | null = null;

  if (imageFile && imageFile.size > 0) {
    image_url = await uploadCategoryImage(input.slug, imageFile);
  }

  const { data, error } = await client
    .from("categories")
    .insert({ ...input, image_url })
    .select("id")
    .single();
  if (error) throw error;

  revalidatePath("/admin/categories");
  revalidatePath("/products");
  return data.id;
}

export async function updateCategory(
  id: string,
  input: CategoryInput,
  imageFile?: File | null,
): Promise<void> {
  const client = getSupabaseAdminClient();
  const patch: CategoryInput & { image_url?: string } = { ...input };

  if (imageFile && imageFile.size > 0) {
    patch.image_url = await uploadCategoryImage(input.slug, imageFile);
  }

  const { error } = await client.from("categories").update(patch).eq("id", id);
  if (error) throw error;

  revalidatePath("/admin/categories");
  revalidatePath("/products");
}

/** Refuses to delete a category that still has products assigned to it
 *  (matched by name) so a live product never silently loses its category
 *  metadata — admin has to reassign those products first. */
export async function deleteCategory(id: string): Promise<void> {
  const client = getSupabaseAdminClient();
  const { data: category, error: catError } = await client
    .from("categories")
    .select("name")
    .eq("id", id)
    .single();
  if (catError) throw catError;

  const { count, error: countError } = await client
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("category", category.name);
  if (countError) throw countError;
  if ((count ?? 0) > 0) {
    throw new Error(`Cannot delete "${category.name}" — ${count} product(s) still use it.`);
  }

  const { error } = await client.from("categories").delete().eq("id", id);
  if (error) throw error;

  revalidatePath("/admin/categories");
  revalidatePath("/products");
}

async function uploadCategoryImage(slug: string, file: File): Promise<string> {
  const client = getSupabaseAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());
  const webp = await toWebp(buffer);
  const path = `categories/${slug}-${Date.now()}.webp`;

  const { error } = await client.storage
    .from(STORAGE_BUCKET)
    .upload(path, webp, { contentType: "image/webp", upsert: true });
  if (error) throw error;

  const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
