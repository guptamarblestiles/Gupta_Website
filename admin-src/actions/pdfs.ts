"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAction } from "@admin/lib/run";
import { fail, type ActionResult } from "@admin/lib/actionResult";
import { MAX_PDF_MB, PDF_BUCKET, SOURCE_PDF_FOLDER, publicStorageUrl } from "@admin/lib/env";
import { cleanText, slugify } from "@admin/lib/catalogue/normalize";
import { refreshPublicSite } from "@admin/lib/publicSite";
import { DEMO } from "@admin/lib/demo/mode";

const prepareSchema = z.object({
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  filename: z.string().min(1).max(200),
  size: z.number().int().positive(),
  pageCount: z.number().int().positive().max(5000),
  title: z.string().max(200),
});

export type PreparedUpload =
  | { kind: "existing"; id: string; title: string }
  | { kind: "upload"; id: string; signedUrl: string; renamedTo?: string };

/**
 * Step 1 of an upload: find-or-create the library record BEFORE any bytes
 * move, keyed on the file's SHA-256. The same PDF uploaded twice (or a
 * retry after a dropped connection) resolves to the same record and path;
 * a different PDF with the same file name gets its own record and path,
 * so nothing is ever silently replaced.
 */
export async function preparePdfUpload(input: z.input<typeof prepareSchema>): Promise<ActionResult<PreparedUpload>> {
  return runAction<PreparedUpload>("editor", async ({ db, session }) => {
    if (DEMO) return fail("Demo mode: PDFs aren't uploaded. Try “Find products” on the sample catalogue in the library instead.");
    const parsed = prepareSchema.safeParse(input);
    if (!parsed.success) return fail("That file couldn't be read as a PDF.");
    const { sha256, size, pageCount } = parsed.data;
    if (size > MAX_PDF_MB * 1024 * 1024) return fail(`This PDF is larger than ${MAX_PDF_MB} MB, the storage limit. Save a compressed copy and upload that.`);
    const filename = parsed.data.filename.replace(/[\\/]/g, "_");
    const title = cleanText(parsed.data.title) ?? filename.replace(/\.pdf$/i, "");

    const { data: existing, error: findError } = await db
      .from("source_pdfs")
      .select("id, title, status, storage_path")
      .eq("sha256", sha256)
      .maybeSingle();
    if (findError) throw findError;

    let id: string;
    let path: string;
    let renamedTo: string | undefined;
    if (existing && (existing.status === "ready" || existing.status === "archived")) {
      return { ok: true, message: "This PDF is already in the library.", data: { kind: "existing", id: existing.id, title: existing.title } };
    }
    if (existing) {
      id = existing.id;
      path = existing.storage_path;
    } else {
      // original_filename is unique in the existing schema; keep the real
      // name when free, otherwise "Name (2).pdf".
      const { data: sameName } = await db.from("source_pdfs").select("original_filename").ilike("original_filename", `${filename.replace(/\.pdf$/i, "").replace(/[%_\\]/g, "\\$&")}%`);
      const taken = new Set((sameName ?? []).map((r) => (r.original_filename as string).toLowerCase()));
      let original = filename;
      for (let n = 2; taken.has(original.toLowerCase()); n++) original = filename.replace(/(\.pdf)?$/i, ` (${n}).pdf`);
      if (original !== filename) renamedTo = original;

      const base = slugify(title) || "catalogue";
      const { data: slugs } = await db.from("source_pdfs").select("slug").like("slug", `${base}%`);
      const takenSlugs = new Set((slugs ?? []).map((r) => r.slug as string));
      let slug = base;
      for (let n = 2; takenSlugs.has(slug); n++) slug = `${base}-${n}`;

      path = `${SOURCE_PDF_FOLDER}/${slug}-${sha256.slice(0, 10)}.pdf`;
      const { data: created, error } = await db
        .from("source_pdfs")
        .insert({
          slug,
          title,
          original_filename: original,
          sha256,
          storage_path: path,
          file_size_bytes: size,
          page_count: pageCount,
          status: "uploading",
          uploaded_by: session.userId,
        })
        .select("id")
        .single();
      if (error) throw error;
      id = created.id;
    }

    const { data: signed, error: signError } = await db.storage.from(PDF_BUCKET).createSignedUploadUrl(path, { upsert: false });
    if (signError) {
      // Already uploaded on an earlier attempt (content-addressed path).
      if (/exists/i.test(signError.message)) return { ok: true, message: "", data: { kind: "upload", id, signedUrl: "", renamedTo } };
      throw signError;
    }
    return { ok: true, message: "", data: { kind: "upload", id, signedUrl: signed.signedUrl, renamedTo } };
  });
}

/** Step 2: confirm the file really is in Storage, then mark the record ready. */
export async function completePdfUpload(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction<{ id: string }>("editor", async ({ db }) => {
    const { data: row, error } = await db.from("source_pdfs").select("storage_path, title").eq("id", id).single();
    if (error) throw error;
    const path = row.storage_path as string;
    const folder = path.split("/").slice(0, -1).join("/");
    const name = path.split("/").pop()!;
    const { data: found, error: listError } = await db.storage.from(PDF_BUCKET).list(folder, { search: name, limit: 5 });
    if (listError) throw listError;
    const object = found?.find((f) => f.name === name);
    if (!object) {
      await db.from("source_pdfs").update({ status: "failed" }).eq("id", id);
      return fail("The upload didn't arrive in storage. Press Retry.");
    }
    const { error: updError } = await db
      .from("source_pdfs")
      .update({
        status: "ready",
        file_url: publicStorageUrl(PDF_BUCKET, path),
        file_size_bytes: (object.metadata as { size?: number } | null)?.size ?? undefined,
      })
      .eq("id", id);
    if (updError) throw updError;
    revalidatePath("/admin/pdfs");
    return { ok: true, message: `“${row.title}” is in the library.`, data: { id } };
  });
}

export async function markPdfUploadFailed(id: string): Promise<ActionResult> {
  return runAction("editor", async ({ db }) => {
    await db.from("source_pdfs").update({ status: "failed" }).eq("id", id).eq("status", "uploading");
    revalidatePath("/admin/pdfs");
    return { ok: true, message: "" };
  });
}

export async function updatePdfDetails(id: string, title: string, description: string): Promise<ActionResult> {
  return runAction("editor", async ({ db }) => {
    const t = cleanText(title);
    if (!t) return fail("Enter a title.");
    const { error } = await db.from("source_pdfs").update({ title: t, description: cleanText(description) }).eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/pdfs");
    revalidatePath(`/admin/pdfs/${id}`);
    // Product pages show this title next to the download button.
    return { ok: true, message: "Title updated. The file itself is unchanged.", publicSync: await refreshPublicSite() };
  });
}

/** Archive hides a PDF from the active library; products that link to it
 *  keep their working download link. */
export async function setPdfArchived(id: string, archived: boolean): Promise<ActionResult> {
  return runAction("editor", async ({ db }) => {
    const { error } = await db
      .from("source_pdfs")
      .update({ status: archived ? "archived" : "ready", archived_at: archived ? new Date().toISOString() : null })
      .eq("id", id)
      .in("status", archived ? ["ready", "failed"] : ["archived"]);
    if (error) throw error;
    revalidatePath("/admin/pdfs");
    return { ok: true, message: archived ? "Moved to the archive. Product download links still work." : "Restored to the library." };
  });
}

export async function setPdfImportStatus(id: string, status: "not_started" | "in_progress" | "reviewed"): Promise<ActionResult> {
  return runAction("editor", async ({ db }) => {
    const { error } = await db.from("source_pdfs").update({ import_status: status }).eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/pdfs");
    revalidatePath(`/admin/pdfs/${id}`);
    return { ok: true, message: status === "reviewed" ? "Marked as fully reviewed." : "Import status updated." };
  });
}

/**
 * Owners only. Refuses while any product or homepage catalogue uses the
 * PDF. Deletes the stored file only when no other record points at it.
 */
export async function deletePdf(id: string): Promise<ActionResult> {
  return runAction("owner", async ({ db }) => {
    const { data: row, error } = await db.from("source_pdfs").select("title, storage_path, file_url").eq("id", id).single();
    if (error) throw error;
    const { count: products } = await db.from("products").select("id", { count: "exact", head: true }).eq("source_pdf_id", id);
    if (products) return fail(`${products} product${products === 1 ? " links" : "s link"} to this PDF. Unlink ${products === 1 ? "it" : "them"} first, or archive the PDF instead.`);
    const { count: catalogues } = row.file_url
      ? await db.from("catalogues").select("id", { count: "exact", head: true }).or(`source_pdf_id.eq.${id},pdf_url.eq.${JSON.stringify(row.file_url)}`)
      : await db.from("catalogues").select("id", { count: "exact", head: true }).eq("source_pdf_id", id);
    if (catalogues) return fail("This PDF is shown on the homepage. Remove it from Homepage catalogues first.");

    const { error: delError, count } = await db.from("source_pdfs").delete({ count: "exact" }).eq("id", id);
    if (delError) throw delError;
    if (!count) return fail("The PDF could not be deleted. You may not have permission.");
    let fileNote = "";
    if (row.storage_path) {
      const { error: rmError } = await db.storage.from(PDF_BUCKET).remove([row.storage_path]);
      fileNote = rmError ? " The file couldn't be removed from storage; it is listed as unused in Images." : "";
    }
    revalidatePath("/admin/pdfs");
    return { ok: true, message: `Deleted “${row.title}”.${fileNote}` };
  });
}
