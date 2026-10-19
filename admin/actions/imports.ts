"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAction } from "@/lib/run";
import { fail, type ActionResult } from "@/lib/actionResult";
import {
  CANDIDATE_FIELDS,
  fillOnlyEmpty,
  mergeWithDefaults,
  newCandidateSchema,
  type Candidate,
  type CandidateValues,
  type NewCandidate,
} from "@/lib/catalogue/candidate";
import { productInputSchema, toProductColumns, zodFieldErrors } from "@/lib/catalogue/product";
import { cleanText, slugify } from "@/lib/catalogue/normalize";

const CANDIDATE_COLUMNS =
  "id, source_pdf_id, page, crop, crop_key, image_path, image_url, image_width, image_height, detection, suggested, warnings, status, product_id, updated_at";

/**
 * Save tiles found on a page. Auto-detected crops are keyed (crop_key), so
 * scanning a page again never duplicates them and never overwrites edits a
 * reviewer already made to an existing candidate.
 */
export async function saveCandidates(pdfId: string, items: NewCandidate[]): Promise<ActionResult<Candidate[]>> {
  return runAction<Candidate[]>("editor", async ({ db, session }) => {
    const parsed = z.array(newCandidateSchema).max(60).safeParse(items);
    if (!parsed.success) return fail("Some detected tiles had invalid data and were not saved.");
    const rows = parsed.data.map((c) => ({ ...c, source_pdf_id: pdfId, created_by: session.userId }));
    const keyed = rows.filter((r) => r.crop_key);
    const manual = rows.filter((r) => !r.crop_key);
    if (keyed.length) {
      const { error } = await db.from("pdf_import_candidates").upsert(keyed, { onConflict: "source_pdf_id,crop_key", ignoreDuplicates: true });
      if (error) throw error;
    }
    if (manual.length) {
      const { error } = await db.from("pdf_import_candidates").insert(manual);
      if (error) throw error;
    }
    await db.from("source_pdfs").update({ import_status: "in_progress" }).eq("id", pdfId).eq("import_status", "not_started");
    const pages = [...new Set(rows.map((r) => r.page))];
    const { data, error } = await db.from("pdf_import_candidates").select(CANDIDATE_COLUMNS).eq("source_pdf_id", pdfId).in("page", pages.length ? pages : [0]);
    if (error) throw error;
    return { ok: true, message: "", data: (data ?? []) as Candidate[] };
  });
}

export async function listCandidates(pdfId: string): Promise<ActionResult<Candidate[]>> {
  return runAction<Candidate[]>("viewer", async ({ db }) => {
    const { data, error } = await db.from("pdf_import_candidates").select(CANDIDATE_COLUMNS).eq("source_pdf_id", pdfId).order("page").order("created_at");
    if (error) throw error;
    return { ok: true, message: "", data: (data ?? []) as Candidate[] };
  });
}

const valuesSchema = z.record(z.enum(CANDIDATE_FIELDS), z.union([z.string().max(200), z.null()]));

export async function updateCandidate(
  id: string,
  patch: { values?: CandidateValues; status?: "pending" | "skipped" | "rejected" },
): Promise<ActionResult<Candidate>> {
  return runAction<Candidate>("editor", async ({ db }) => {
    const update: Record<string, unknown> = {};
    if (patch.values) {
      const v = valuesSchema.safeParse(patch.values);
      if (!v.success) return fail("Some values are too long.");
      update.suggested = v.data;
    }
    if (patch.status) update.status = patch.status;
    const { data, error } = await db.from("pdf_import_candidates").update(update).eq("id", id).neq("status", "created").select(CANDIDATE_COLUMNS).maybeSingle();
    if (error) throw error;
    if (!data) return fail("This tile was already turned into a product.");
    return { ok: true, message: "", data: data as Candidate };
  });
}

export async function deleteCandidate(id: string): Promise<ActionResult> {
  return runAction("editor", async ({ db }) => {
    const { error, count } = await db.from("pdf_import_candidates").delete({ count: "exact" }).eq("id", id).neq("status", "created");
    if (error) throw error;
    if (!count) return fail("Tiles that became products can't be removed here.");
    return { ok: true, message: "Crop removed." };
  });
}

/** Existing products for these codes (case-insensitive), for duplicate warnings. */
export async function findExistingCodes(codes: string[]): Promise<Record<string, { id: string; name: string }>> {
  const list = [...new Set(codes.map((c) => cleanText(c)).filter((c): c is string => Boolean(c)))].slice(0, 200);
  if (!list.length) return {};
  const res = await runAction<Record<string, { id: string; name: string }>>("viewer", async ({ db }) => {
    const { data, error } = await db.from("products").select("id, name, product_code").in("product_code", list);
    if (error) throw error;
    const out: Record<string, { id: string; name: string }> = {};
    for (const r of data ?? []) out[(r.product_code as string).toUpperCase()] = { id: r.id, name: r.name };
    return { ok: true, message: "", data: out };
  });
  return res.ok ? (res.data ?? {}) : {};
}

const approveSchema = z.object({
  values: valuesSchema,
  defaults: z.record(z.string(), z.union([z.string().max(200), z.null()])).default({}),
  status: z.enum(["review", "draft"]).default("review"),
  /** Set only after the reviewer explicitly chose "add to this existing product". */
  existingProductId: z.string().uuid().nullish(),
});

/**
 * Turn a reviewed tile into a product (never published automatically —
 * it starts as "Needs review" or "Draft"), or attach it to an existing
 * product the reviewer explicitly confirmed. Idempotent: approving the
 * same tile twice returns the product created the first time.
 */
export async function approveCandidate(id: string, input: z.input<typeof approveSchema>): Promise<ActionResult<{ productId: string; created: boolean }>> {
  return runAction<{ productId: string; created: boolean }>("editor", async ({ db }) => {
    const parsed = approveSchema.safeParse(input);
    if (!parsed.success) return fail("Some values are invalid.");
    const { data: cand, error } = await db.from("pdf_import_candidates").select(CANDIDATE_COLUMNS).eq("id", id).single();
    if (error) throw error;
    const c = cand as Candidate;
    if (c.status === "created" && c.product_id) return { ok: true, message: "Already created.", data: { productId: c.product_id, created: false } };
    if (!c.image_url) return fail("This crop has no image yet. Find tiles on the page again.");

    const v = mergeWithDefaults(parsed.data.values, parsed.data.defaults);

    if (parsed.data.existingProductId) {
      const { data: existing, error: exErr } = await db.from("products").select("*").eq("id", parsed.data.existingProductId).single();
      if (exErr) throw exErr;
      const incoming = {
        size: v.size,
        finish: v.finish,
        application: v.application,
        thickness: v.thickness,
        material: v.material,
        series: v.series,
        source_pdf_id: c.source_pdf_id,
        source_page: c.page,
      };
      const patch = fillOnlyEmpty(existing, incoming);
      if (Object.keys(patch).length) {
        const { error: updErr } = await db.from("products").update(patch).eq("id", existing.id);
        if (updErr) throw updErr;
      }
      const { data: imgs } = await db.from("product_images").select("image_url, sort_order").eq("product_id", existing.id).order("sort_order");
      const urls = (imgs ?? []).map((r) => r.image_url as string);
      if (!urls.includes(c.image_url)) {
        const { error: setErr } = await db.rpc("admin_set_product_images", { p_product_id: existing.id, p_image_urls: [...urls, c.image_url] });
        if (setErr) throw setErr;
      }
      await db.from("pdf_import_candidates").update({ status: "created", product_id: existing.id }).eq("id", id);
      revalidatePath(`/products/${existing.id}`);
      return {
        ok: true,
        message: `Added to “${existing.name}”. Only empty fields were filled; nothing was overwritten.`,
        data: { productId: existing.id, created: false },
      };
    }

    // Slug: name + code, unique.
    const base = slugify(`${v.name ?? ""} ${v.product_code ?? ""}`) || "product";
    const { data: slugs } = await db.from("products").select("slug").like("slug", `${base}%`);
    const taken = new Set((slugs ?? []).map((r) => r.slug as string));
    let slug = base;
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;

    const product = productInputSchema.safeParse({
      name: v.name ?? "",
      product_code: v.product_code ?? "",
      slug,
      category: v.category ?? "",
      status: parsed.data.status,
      series: v.series,
      finish: v.finish,
      size: v.size,
      application: v.application,
      thickness: v.thickness,
      material: v.material,
      faces: v.faces,
      source_pdf_id: c.source_pdf_id,
      source_page: c.page,
      images: [c.image_url],
    });
    if (!product.success) {
      const errs = zodFieldErrors(product.error);
      return fail(`Fill in: ${Object.keys(errs).map((k) => k.replace("product_code", "product code")).join(", ")}.`, errs);
    }
    const { data: created, error: insErr } = await db
      .from("products")
      .insert({ ...toProductColumns(product.data), status: parsed.data.status })
      .select("id")
      .single();
    if (insErr) throw insErr;
    const { error: imgErr } = await db.rpc("admin_set_product_images", { p_product_id: created.id, p_image_urls: [c.image_url] });
    if (imgErr) throw imgErr;
    await db.from("pdf_import_candidates").update({ status: "created", product_id: created.id, suggested: parsed.data.values }).eq("id", id);
    revalidatePath("/products");
    return {
      ok: true,
      message: `Created “${product.data.name}” as ${parsed.data.status === "review" ? "Needs review" : "Draft"}.`,
      data: { productId: created.id, created: true },
    };
  });
}
