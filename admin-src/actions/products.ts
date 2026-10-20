"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@admin/lib/run";
import { fail, type ActionResult } from "@admin/lib/actionResult";
import { productInputSchema, toProductColumns, zodFieldErrors, STATUS_LABELS, type ProductInput, type ProductStatus, PRODUCT_STATUSES } from "@admin/lib/catalogue/product";
import { cleanText, slugify } from "@admin/lib/catalogue/normalize";
import { refreshPublicSite, syncNote } from "@admin/lib/publicSite";
import { searchTerm } from "@admin/lib/data/products";

function revalidateAdmin(id?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  if (id) revalidatePath(`/admin/products/${id}`);
}

/**
 * Create or update one product, its gallery, and its status — in that
 * order, so a product is never published before its images exist. The
 * database enforces the same rules again (trigger + RLS).
 */
export async function saveProduct(id: string | null, input: ProductInput): Promise<ActionResult<{ id: string; slug: string }>> {
  return runAction("editor", async ({ db }) => {
    const parsed = productInputSchema.safeParse(input);
    if (!parsed.success) return fail("Some fields need attention.", zodFieldErrors(parsed.error));
    const v = parsed.data;
    const columns = toProductColumns(v);

    // Status is applied last, after images, so publishing can check them.
    let productId = id;
    let previousStatus: ProductStatus | null = null;
    let statusNow: ProductStatus;
    if (productId) {
      const { data: current, error } = await db.from("products").select("status").eq("id", productId).single();
      if (error) throw error;
      previousStatus = current.status as ProductStatus;
      statusNow = previousStatus;
      const { error: updError } = await db.from("products").update(columns).eq("id", productId);
      if (updError) throw updError;
    } else {
      statusNow = v.status === "published" ? "draft" : v.status;
      const { data: created, error } = await db.from("products").insert({ ...columns, status: statusNow }).select("id").single();
      if (error) throw error;
      productId = created.id as string;
    }

    const { error: imgError } = await db.rpc("admin_set_product_images", { p_product_id: productId, p_image_urls: v.images });
    if (imgError) throw imgError;

    let statusNote = "";
    const target = v.status;
    if (target !== statusNow) {
      const { error: stError } = await db.from("products").update({ status: target }).eq("id", productId);
      if (stError) {
        // Everything else is saved; say exactly what didn't happen.
        revalidateAdmin(productId);
        return {
          ok: true,
          message: id ? "Details saved." : "Saved as a draft.",
          warning: `Not published: ${stError.message}`,
          data: { id: productId, slug: v.slug },
          publicSync: previousStatus === "published" ? await refreshPublicSite() : "not_needed",
        };
      }
      statusNote = ` Status: ${STATUS_LABELS[target]}.`;
    }

    revalidateAdmin(productId);
    const affectsPublic = target === "published" || previousStatus === "published";
    const publicSync = affectsPublic ? await refreshPublicSite() : "not_needed";
    return {
      ok: true,
      message: (id ? "Product saved." : "Product created.") + statusNote,
      data: { id: productId, slug: v.slug },
      publicSync,
    };
  });
}

/** Bulk or single status change. Reports per-product failures (e.g. a
 *  product with no image can't be published) instead of all-or-nothing. */
export async function setProductStatus(ids: string[], status: ProductStatus): Promise<ActionResult<{ failed: { id: string; reason: string }[] }>> {
  return runAction("editor", async ({ db }) => {
    if (!(PRODUCT_STATUSES as readonly string[]).includes(status)) return fail("Unknown status.");
    if (!ids.length) return fail("Select at least one product.");
    if (ids.length > 200) return fail("Change at most 200 products at a time.");
    const failed: { id: string; reason: string }[] = [];
    let done = 0;
    for (const id of ids) {
      const { error } = await db.from("products").update({ status }).eq("id", id);
      if (error) failed.push({ id, reason: error.message });
      else done++;
    }
    revalidateAdmin();
    for (const id of ids) revalidatePath(`/admin/products/${id}`);
    const publicSync = done ? await refreshPublicSite() : "not_needed";
    const label = STATUS_LABELS[status].toLowerCase();
    if (!done) return { ok: false, message: failed[0]?.reason ?? "Nothing changed." };
    return {
      ok: true,
      message: failed.length
        ? `${done} marked ${label}; ${failed.length} couldn't be (${failed[0].reason})`
        : `${done === 1 ? "Product" : `${done} products`} marked ${label}.`,
      data: { failed },
      publicSync,
    };
  });
}

export async function setProductCategory(ids: string[], category: string): Promise<ActionResult> {
  return runAction("editor", async ({ db }) => {
    const value = cleanText(category);
    if (!value) return fail("Choose a category.");
    if (!ids.length) return fail("Select at least one product.");
    const { error, count } = await db.from("products").update({ category: value }, { count: "exact" }).in("id", ids);
    if (error) throw error;
    revalidateAdmin();
    const publicSync = await refreshPublicSite();
    return { ok: true, message: `Moved ${count ?? ids.length} to “${value}”.`, publicSync };
  });
}

/** Permanent delete (owners only, also enforced by RLS). Images rows go with
 *  it; the image FILES stay in the library as unused, never deleted here. */
export async function deleteProduct(id: string, typedCode: string): Promise<ActionResult> {
  return runAction("owner", async ({ db }) => {
    const { data: product, error } = await db.from("products").select("product_code, name, status").eq("id", id).single();
    if (error) throw error;
    if (typedCode.trim() !== product.product_code) return fail("The product code you typed doesn't match.");
    const { error: delError, count } = await db.from("products").delete({ count: "exact" }).eq("id", id);
    if (delError) throw delError;
    if (!count) return fail("The product could not be deleted. You may not have permission.");
    revalidateAdmin();
    const publicSync = product.status === "published" ? await refreshPublicSite() : "not_needed";
    return { ok: true, message: `Deleted “${product.name}”. Its image files remain in the image library.`, publicSync };
  });
}

export async function checkProductCode(code: string, excludeId?: string): Promise<{ id: string; name: string } | null> {
  const value = cleanText(code);
  if (!value) return null;
  const res = await runAction("viewer", async ({ db }) => {
    let q = db.from("products").select("id, name").ilike("product_code", value.replace(/[%_\\]/g, "\\$&"));
    if (excludeId) q = q.neq("id", excludeId);
    const { data } = await q.limit(1).maybeSingle();
    return { ok: true, message: "", data: data ?? null };
  });
  return res.ok ? (res.data ?? null) : null;
}

/** Slug suggestion that doesn't collide with existing products. */
export async function suggestSlug(name: string, code: string, excludeId?: string): Promise<string> {
  const base = slugify(`${name} ${code}`.trim()) || "product";
  const res = await runAction("viewer", async ({ db }) => {
    let q = db.from("products").select("slug").like("slug", `${base}%`);
    if (excludeId) q = q.neq("id", excludeId);
    const { data } = await q.limit(200);
    const taken = new Set((data ?? []).map((r) => r.slug as string));
    let slug = base;
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
    return { ok: true, message: "", data: slug };
  });
  return res.ok ? res.data! : base;
}

export type ProductPick = { id: string; name: string; product_code: string; status: ProductStatus; thumbnail: string | null };

export async function searchProductsForPicker(q: string): Promise<ProductPick[]> {
  const res = await runAction("viewer", async ({ db }) => {
    const term = searchTerm(q);
    let query = db
      .from("products")
      .select("id, name, product_code, status, product_images(image_url, sort_order)")
      .order("updated_at", { ascending: false })
      .limit(12);
    if (term) query = query.or(`name.ilike.%${term}%,product_code.ilike.%${term}%`);
    const { data, error } = await query;
    if (error) throw error;
    return {
      ok: true,
      message: "",
      data: (data ?? []).map((r) => {
        const imgs = [...((r.product_images as { image_url: string; sort_order: number }[]) ?? [])].sort((a, b) => a.sort_order - b.sort_order);
        return { id: r.id, name: r.name, product_code: r.product_code, status: r.status, thumbnail: imgs[0]?.image_url ?? null };
      }),
    };
  });
  return res.ok ? (res.data ?? []) : [];
}

/** Retry the public-site refresh on its own (shown when it failed). */
export async function retryPublicRefresh(): Promise<ActionResult> {
  return runAction("editor", async () => {
    const sync = await refreshPublicSite();
    return sync === "refreshed" ? { ok: true, message: syncNote(sync), publicSync: sync } : { ok: false, message: syncNote(sync) };
  });
}
