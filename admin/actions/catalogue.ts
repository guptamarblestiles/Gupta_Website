"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAction } from "@/lib/run";
import { fail, type ActionResult } from "@/lib/actionResult";
import { cleanText, slugify } from "@/lib/catalogue/normalize";
import { refreshPublicSite } from "@/lib/publicSite";

const FILTER_COLUMNS = ["category", "finish", "size", "color", "application", "pattern", "thickness", "series", "material", "rooms"] as const;
export type FilterColumn = (typeof FILTER_COLUMNS)[number];

function revalidateCatalogue() {
  revalidatePath("/categories");
  revalidatePath("/filters");
  revalidatePath("/products");
}

/** How many products a rename/merge would touch, shown before confirming. */
export async function previewRename(column: FilterColumn, from: string): Promise<ActionResult<{ total: number; published: number }>> {
  return runAction<{ total: number; published: number }>("viewer", async ({ db }) => {
    const { data, error } = await db.rpc("admin_filter_values");
    if (error) throw error;
    const row = ((data ?? []) as { filter: string; value: string; total: number; published: number }[]).find((r) => r.filter === column && r.value === from);
    return { ok: true, message: "", data: { total: Number(row?.total ?? 0), published: Number(row?.published ?? 0) } };
  });
}

/**
 * Rename one value, or merge it into another existing value, across every
 * product — one reviewed database statement (admin_rename_filter_value).
 * Distinct products are never merged; only the label they share changes.
 */
export async function renameFilterValue(column: FilterColumn, from: string, to: string): Promise<ActionResult> {
  return runAction("editor", async ({ db }) => {
    if (!FILTER_COLUMNS.includes(column)) return fail("Unknown filter.");
    const target = cleanText(to);
    if (!target) return fail("Enter the new value.");
    if (target === from) return fail("That's the same value.");
    const { data, error } = await db.rpc("admin_rename_filter_value", { p_column: column, p_from: from, p_to: target });
    if (error) throw error;
    revalidateCatalogue();
    const n = Number(data ?? 0);
    return { ok: true, message: `Updated ${n} product${n === 1 ? "" : "s"}: “${from}” → “${target}”.`, publicSync: n ? await refreshPublicSite() : "not_needed" };
  });
}

const categorySchema = z.object({
  name: z.string().transform((v) => cleanText(v) ?? "").pipe(z.string().min(1, "Enter a name.").max(80)),
  description: z.string().max(500).nullish().transform((v) => cleanText(v)),
  is_visible: z.boolean(),
  sort_order: z.coerce.number().int().min(0).max(9999),
  image_url: z.string().url().nullish().or(z.literal("").transform(() => null)),
});

export async function saveCategory(id: string | null, input: z.input<typeof categorySchema>): Promise<ActionResult> {
  return runAction("editor", async ({ db }) => {
    const parsed = categorySchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the fields.");
    const v = parsed.data;

    if (id) {
      const { data: current, error } = await db.from("categories").select("name").eq("id", id).single();
      if (error) throw error;
      if (current.name !== v.name) {
        const { data: clash } = await db.from("categories").select("id").eq("name", v.name).neq("id", id).maybeSingle();
        if (clash) return fail(`A category called “${v.name}” already exists. Use Filters → merge to combine them.`);
        // Renames the products' category label and this row together.
        const { error: renameError } = await db.rpc("admin_rename_filter_value", { p_column: "category", p_from: current.name, p_to: v.name });
        if (renameError) throw renameError;
      }
      const { error: updError } = await db
        .from("categories")
        .update({ description: v.description, is_visible: v.is_visible, sort_order: v.sort_order, image_url: v.image_url ?? null })
        .eq("id", id);
      if (updError) throw updError;
    } else {
      const base = slugify(v.name) || "category";
      const { data: slugs } = await db.from("categories").select("slug").like("slug", `${base}%`);
      const taken = new Set((slugs ?? []).map((r) => r.slug as string));
      let slug = base;
      for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
      const { error: insError } = await db.from("categories").insert({ ...v, image_url: v.image_url ?? null, slug });
      if (insError) throw insError;
    }
    revalidateCatalogue();
    return { ok: true, message: id ? "Category saved." : `Category “${v.name}” created.`, publicSync: await refreshPublicSite() };
  });
}

/** Owners only; refuses while products still use the category. */
export async function deleteCategory(id: string): Promise<ActionResult> {
  return runAction("owner", async ({ db }) => {
    const { data: cat, error } = await db.from("categories").select("name").eq("id", id).single();
    if (error) throw error;
    const { count } = await db.from("products").select("id", { count: "exact", head: true }).eq("category", cat.name);
    if (count) return fail(`${count} product${count === 1 ? " uses" : "s use"} “${cat.name}”. Move ${count === 1 ? "it" : "them"} to another category first.`);
    const { error: delError } = await db.from("categories").delete().eq("id", id);
    if (delError) throw delError;
    revalidateCatalogue();
    return { ok: true, message: `Deleted “${cat.name}”.`, publicSync: await refreshPublicSite() };
  });
}

/** Turn a raw label already used by products into a managed category. */
export async function adoptCategoryLabel(name: string): Promise<ActionResult> {
  return saveCategory(null, { name, description: null, is_visible: true, sort_order: 100, image_url: null });
}
