"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAction } from "@/lib/run";
import { fail, type ActionResult } from "@/lib/actionResult";
import { cleanText } from "@/lib/catalogue/normalize";
import { refreshPublicSite } from "@/lib/publicSite";

/**
 * The homepage "Catalogues" section reads public.catalogues (see the public
 * site's lib/catalogues/queries.ts). It is prerendered, so every change
 * here refreshes the public site's cache.
 */
async function done(message: string): Promise<ActionResult> {
  revalidatePath("/catalogues");
  return { ok: true, message, publicSync: await refreshPublicSite() };
}

export async function addCatalogueFromLibrary(sourcePdfId: string): Promise<ActionResult> {
  return runAction("editor", async ({ db }) => {
    const { data: pdf, error } = await db.from("source_pdfs").select("id, title, description, file_url, file_size_bytes").eq("id", sourcePdfId).single();
    if (error) throw error;
    if (!pdf.file_url) return fail("That PDF has no uploaded file yet.");
    const { data: existing } = await db.from("catalogues").select("id").eq("source_pdf_id", pdf.id).maybeSingle();
    if (existing) return fail("That PDF is already on the homepage.");
    const { data: last } = await db.from("catalogues").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const { error: insError } = await db.from("catalogues").insert({
      title: pdf.title,
      description: pdf.description,
      pdf_url: pdf.file_url,
      pdf_size_bytes: pdf.file_size_bytes,
      source_pdf_id: pdf.id,
      is_visible: true,
      sort_order: (last?.sort_order ?? 0) + 1,
    });
    if (insError) throw insError;
    return done(`“${pdf.title}” added to the homepage.`);
  });
}

const editSchema = z.object({
  title: z.string().transform((v) => cleanText(v) ?? "").pipe(z.string().min(1).max(160)),
  description: z.string().max(500).nullish().transform((v) => cleanText(v)),
  is_visible: z.boolean(),
  thumbnail_url: z.string().url().nullish().or(z.literal("").transform(() => null)),
});

export async function updateCatalogue(id: string, input: z.input<typeof editSchema>): Promise<ActionResult> {
  return runAction("editor", async ({ db }) => {
    const parsed = editSchema.safeParse(input);
    if (!parsed.success) return fail("Enter a title.");
    const { error } = await db.from("catalogues").update(parsed.data).eq("id", id);
    if (error) throw error;
    return done("Saved.");
  });
}

export async function reorderCatalogues(ids: string[]): Promise<ActionResult> {
  return runAction("editor", async ({ db }) => {
    for (const [i, id] of ids.entries()) {
      const { error } = await db.from("catalogues").update({ sort_order: i + 1 }).eq("id", id);
      if (error) throw error;
    }
    return done("Order saved.");
  });
}

/** Removes it from the homepage only. The PDF file and library record stay. */
export async function removeCatalogue(id: string): Promise<ActionResult> {
  return runAction("editor", async ({ db }) => {
    const { error } = await db.from("catalogues").delete().eq("id", id);
    if (error) throw error;
    return done("Removed from the homepage. The PDF itself is unchanged.");
  });
}
