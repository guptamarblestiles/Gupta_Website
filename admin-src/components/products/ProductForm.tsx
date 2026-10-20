"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ExternalLink, Eye, Save, X } from "lucide-react";
import { Button, LinkButton } from "@admin/components/ui/Button";
import { Card, CardHeader, Notice } from "@admin/components/ui/Display";
import { Field, Input, Select, Textarea } from "@admin/components/ui/Field";
import { ImageManager } from "@admin/components/products/ImageManager";
import { useAction } from "@admin/lib/client/useAction";
import { checkProductCode, saveProduct, suggestSlug } from "@admin/actions/products";
import {
  APPLICATIONS,
  PRODUCT_STATUSES,
  STATUS_HELP,
  STATUS_LABELS,
  publishBlockers,
  type ProductInput,
  type ProductStatus,
} from "@admin/lib/catalogue/product";
import { cn } from "@admin/lib/cn";
import type { ProductFormValues } from "@admin/lib/catalogue/productForm";

export type { ProductFormValues };

const COMMON_ROOMS = ["Bathroom", "Kitchen", "Living Room", "Bedroom", "Balcony", "Outdoor", "Parking", "Commercial"];

type PdfOption = { id: string; title: string; page_count: number | null; archived: boolean; file_url?: string | null };

export function ProductForm({
  productId,
  initial,
  suggestions,
  pdfs,
  canEdit,
  publicUrl,
  pdfFileUrls,
}: {
  productId: string | null;
  initial: ProductFormValues;
  suggestions: Record<string, string[]>;
  pdfs: PdfOption[];
  canEdit: boolean;
  publicUrl: string | null;
  pdfFileUrls: Record<string, string | null>;
}) {
  const router = useRouter();
  const [v, setV] = useState<ProductFormValues>(initial);
  const [saved, setSaved] = useState<ProductFormValues>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [clashCheck, setClashCheck] = useState<{ code: string; hit: { id: string; name: string } | null } | null>(null);
  const [slugTouched, setSlugTouched] = useState(Boolean(productId));
  const [showMore, setShowMore] = useState(() => Boolean(initial.pattern || initial.color || initial.faces || initial.tiles_per_box || initial.coverage_per_box || initial.finish_detail || initial.material));
  const [showPrice, setShowPrice] = useState(Boolean(initial.price));
  const { run, pending } = useAction();
  const dirty = useMemo(() => JSON.stringify(v) !== JSON.stringify(saved), [v, saved]);
  const disabled = !canEdit;

  const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => {
    setV((s) => ({ ...s, [key]: value }));
    if (errors[key])
      setErrors((e) => {
        const next = { ...e };
        delete next[key];
        return next;
      });
  };

  // Unsaved-changes guard: browser close/reload + in-app link clicks.
  useUnsavedGuard(dirty && !pending);

  // Suggest a URL slug from name + code until the user edits it themselves.
  useEffect(() => {
    if (slugTouched || !v.name.trim()) return;
    const t = setTimeout(async () => {
      const slug = await suggestSlug(v.name, v.product_code, productId ?? undefined);
      setV((s) => (slugTouched ? s : { ...s, slug }));
    }, 400);
    return () => clearTimeout(t);
  }, [v.name, v.product_code, slugTouched, productId]);

  // Live duplicate-code warning (only shown for the code it was checked for).
  const codeToCheck = v.product_code.trim() && v.product_code !== saved.product_code ? v.product_code : "";
  useEffect(() => {
    if (!codeToCheck) return;
    const t = setTimeout(async () => setClashCheck({ code: codeToCheck, hit: await checkProductCode(codeToCheck, productId ?? undefined) }), 400);
    return () => clearTimeout(t);
  }, [codeToCheck, productId]);
  const codeClash = codeToCheck && clashCheck?.code === codeToCheck ? clashCheck.hit : null;

  const blockers = publishBlockers({ name: v.name, product_code: v.product_code, category: v.category, imageCount: v.images.length });
  const selectedPdf = pdfs.find((p) => p.id === v.source_pdf_id);
  const pdfUrl = v.source_pdf_id ? pdfFileUrls[v.source_pdf_id] : null;

  const submit = async (status?: ProductStatus) => {
    const payload: ProductInput = {
      ...v,
      status: status ?? v.status,
      faces: v.faces,
      tiles_per_box: v.tiles_per_box,
      price: v.price,
      source_page: v.source_page,
      source_pdf_id: v.source_pdf_id || null,
    };
    const result = await run(() => saveProduct(productId, payload), { refresh: false });
    if (!result) return;
    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      if (result.fieldErrors) document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
      return;
    }
    const next = { ...v, status: result.warning ? (productId ? saved.status : "draft") : payload.status, slug: result.data?.slug ?? v.slug };
    setSaved(next);
    setV(next);
    setErrors({});
    if (!productId && result.data) router.replace(`/admin/products/${result.data.id}`);
    else router.refresh();
  };

  const text = (key: keyof ProductFormValues, label: string, opts: { hint?: string; optional?: boolean; list?: string; placeholder?: string; inputMode?: "numeric" | "decimal"; mono?: boolean } = {}) => (
    <Field label={label} htmlFor={`f-${key}`} hint={opts.hint} optional={opts.optional} error={errors[key]}>
      <Input
        id={`f-${key}`}
        value={v[key] as string}
        onChange={(e) => set(key, e.target.value as never)}
        list={opts.list ? `dl-${opts.list}` : undefined}
        placeholder={opts.placeholder}
        inputMode={opts.inputMode}
        disabled={disabled}
        aria-invalid={errors[key] ? true : undefined}
        aria-describedby={errors[key] ? `f-${key}-error` : opts.hint ? `f-${key}-hint` : undefined}
        className={opts.mono ? "font-mono" : undefined}
        autoComplete="off"
      />
    </Field>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="grid gap-6 pb-24 lg:grid-cols-[minmax(0,1fr)_320px] lg:pb-0"
      noValidate
    >
      {Object.entries(suggestions).map(([key, list]) => (
        <datalist id={`dl-${key}`} key={key}>
          {list.slice(0, 200).map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      ))}

      <div className="min-w-0 space-y-6">
        {!canEdit && <Notice tone="info">Your account is read-only. You can look but not change anything.</Notice>}

        <Card>
          <CardHeader title="Basics" description="What customers see first." />
          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <div className="sm:col-span-2">{text("name", "Product name", { hint: "As shown on the website, e.g. “Statuario Gold”." })}</div>
            <div>
              {text("product_code", "Product code", { hint: "The manufacturer's design number. Must be unique.", mono: true })}
              {codeClash && (
                <p className="mt-1.5 flex items-start gap-1.5 text-sm text-warning">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>
                    Already used by{" "}
                    <Link href={`/admin/products/${codeClash.id}`} className="font-medium underline">
                      {codeClash.name}
                    </Link>
                    .
                  </span>
                </p>
              )}
            </div>
            {text("category", "Category", { hint: "Pick an existing one to keep the website filter tidy.", list: "category" })}
            {text("series", "Collection / series", { optional: true, list: "series", placeholder: "e.g. Kitchen Series" })}
            {text("size", "Size", { optional: true, list: "size", placeholder: "e.g. 600x1200mm", hint: "Spacing and capitals are tidied automatically." })}
          </div>
        </Card>

        <Card>
          <CardHeader title="Images" description="Drag to reorder. The main image is used in the catalogue grid." />
          <div className="p-5">
            <ImageManager
              value={v.images}
              onChange={(urls) => set("images", urls)}
              folder={`products/${v.slug || "unsorted"}`}
              disabled={disabled}
              error={errors.images}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Specifications" description="Fill in what you know. Empty fields are simply not shown on the website." />
          <div className="grid gap-5 p-5 sm:grid-cols-2">
            {text("finish", "Finish", { optional: true, list: "finish", placeholder: "e.g. Glossy" })}
            <Field label="Application" htmlFor="f-application" optional error={errors.application}>
              <Select id="f-application" value={v.application} onChange={(e) => set("application", e.target.value)} disabled={disabled}>
                <option value="">Not stated</option>
                {APPLICATIONS.map((a) => (
                  <option key={a} value={a}>
                    {a === "Both" ? "Wall and floor" : a}
                  </option>
                ))}
                {v.application && !(APPLICATIONS as readonly string[]).includes(v.application) && <option value={v.application}>{v.application}</option>}
              </Select>
            </Field>
            {text("thickness", "Thickness", { optional: true, list: "thickness", placeholder: "e.g. 9 mm" })}
            {text("material", "Material", { optional: true, list: "material", placeholder: "e.g. Porcelain" })}
            <div className="sm:col-span-2">
              <RoomsField value={v.rooms} onChange={(r) => set("rooms", r)} options={[...new Set([...COMMON_ROOMS, ...(suggestions.rooms ?? [])])]} disabled={disabled} />
            </div>
            {!showMore ? (
              <div className="sm:col-span-2">
                <Button size="sm" variant="ghost" onClick={() => setShowMore(true)}>
                  + More details (pattern, colour, faces, box contents)
                </Button>
              </div>
            ) : (
              <>
                {text("pattern", "Pattern", { optional: true, list: "pattern" })}
                {text("color", "Colour", { optional: true, list: "color" })}
                {text("finish_detail", "Finish detail", { optional: true, hint: "Exact wording from the brand, if different from Finish." })}
                {text("faces", "Number of faces", { optional: true, inputMode: "numeric", hint: "Different print variations of the same design." })}
                {text("tiles_per_box", "Tiles per box", { optional: true, inputMode: "numeric" })}
                {text("coverage_per_box", "Coverage per box", { optional: true, placeholder: "e.g. 1.44 sq m" })}
              </>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Original catalogue" description="Links the product to the brand PDF it came from, so customers can download it." />
          <div className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_140px]">
            <Field label="Source PDF" htmlFor="f-source_pdf_id" optional error={errors.source_pdf_id}>
              <Select id="f-source_pdf_id" value={v.source_pdf_id} onChange={(e) => set("source_pdf_id", e.target.value)} disabled={disabled}>
                <option value="">Not linked</option>
                {pdfs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                    {p.archived ? " (archived)" : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Page"
              htmlFor="f-source_page"
              optional
              error={errors.source_page}
              hint={selectedPdf?.page_count ? `of ${selectedPdf.page_count}` : undefined}
            >
              <Input
                id="f-source_page"
                inputMode="numeric"
                value={v.source_page}
                onChange={(e) => set("source_page", e.target.value.replace(/\D/g, ""))}
                disabled={disabled || !v.source_pdf_id}
                aria-invalid={errors.source_page ? true : undefined}
              />
            </Field>
            {pdfUrl && (
              <a href={`${pdfUrl}${v.source_page ? `#page=${v.source_page}` : ""}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-copper-strong hover:underline sm:col-span-2">
                Open the PDF{v.source_page ? ` at page ${v.source_page}` : ""} <ExternalLink className="size-3.5" />
              </a>
            )}
            {v.source_pdf_id && pdfUrl === null && <Notice tone="warning" className="sm:col-span-2">This PDF record has no uploaded file yet, so customers will see “unavailable”.</Notice>}
          </div>
        </Card>

        <Card>
          <CardHeader title="Description & price" />
          <div className="space-y-5 p-5">
            <Field label="Description" htmlFor="f-description" optional hint="A sentence or two for the product page. Plain text.">
              <Textarea id="f-description" value={v.description} onChange={(e) => set("description", e.target.value)} disabled={disabled} rows={4} />
            </Field>
            {!showPrice ? (
              <Button size="sm" variant="ghost" onClick={() => setShowPrice(true)}>
                + Show a price on the website
              </Button>
            ) : (
              <div className="grid gap-5 sm:grid-cols-3">
                {text("price", "Price (₹)", { optional: true, inputMode: "decimal", hint: "Leave empty to show no price." })}
                {text("price_unit", "Per", { optional: true, placeholder: "sq. ft." })}
                {text("price_note", "Note", { optional: true, placeholder: "starting from" })}
              </div>
            )}
          </div>
        </Card>

        <details className="group rounded-xl border border-line bg-admin-surface shadow-card">
          <summary className="cursor-pointer list-none px-5 py-4 text-[15px] font-semibold text-ink">
            Advanced <span className="ml-1 text-sm font-normal text-ink-faint">web address and internal notes</span>
          </summary>
          <div className="grid gap-5 border-t border-line p-5 sm:grid-cols-2">
            <Field label="Web address (slug)" htmlFor="f-slug" error={errors.slug} hint={`Product page: /products/${v.slug || "…"}. Changing it breaks old links.`}>
              <Input
                id="f-slug"
                value={v.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
                }}
                disabled={disabled}
                className="font-mono text-sm"
                aria-invalid={errors.slug ? true : undefined}
              />
            </Field>
            <Field label="Internal note" htmlFor="f-review_note" optional hint="Only visible in the admin.">
              <Input id="f-review_note" value={v.review_note} onChange={(e) => set("review_note", e.target.value)} disabled={disabled} />
            </Field>
          </div>
        </details>
      </div>

      {/* Publishing sidebar */}
      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader title="Visibility" />
          <fieldset className="space-y-2 p-4" disabled={disabled}>
            <legend className="sr-only">Status</legend>
            {PRODUCT_STATUSES.map((s) => (
              <label
                key={s}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                  v.status === s ? "border-copper bg-copper-soft/60" : "border-line hover:bg-admin-surface-muted",
                )}
              >
                <input type="radio" name="status" value={s} checked={v.status === s} onChange={() => set("status", s)} className="mt-1 accent-copper" />
                <span>
                  <span className="block text-sm font-medium text-ink">{STATUS_LABELS[s]}</span>
                  <span className="block text-xs text-ink-muted">{STATUS_HELP[s]}</span>
                </span>
              </label>
            ))}
            {v.status === "published" && blockers.length > 0 && (
              <Notice tone="warning">To publish, add {blockers.join(", ")}.</Notice>
            )}
          </fieldset>
          <div className="space-y-2 border-t border-line p-4">
            {canEdit && (
              <Button type="submit" variant="primary" className="w-full" loading={pending} icon={<Save className="size-4" />} disabled={!dirty && Boolean(productId)}>
                {productId ? (dirty ? "Save changes" : "Saved") : "Create product"}
              </Button>
            )}
            {productId && (
              <LinkButton href={`/admin/products/${productId}/preview`} className="w-full" icon={<Eye className="size-4" />} target="_blank">
                Preview
              </LinkButton>
            )}
            {publicUrl && saved.status === "published" && (
              <a href={publicUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 pt-1 text-sm font-medium text-copper-strong hover:underline">
                View on website <ExternalLink className="size-3.5" />
              </a>
            )}
            {dirty && <p className="text-center text-xs text-warning">You have unsaved changes.</p>}
          </div>
        </Card>
      </aside>

      {/* Mobile save bar */}
      {canEdit && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-admin-surface/95 px-4 py-3 backdrop-blur lg:hidden">
          <span className="flex-1 text-sm text-ink-muted">{dirty ? "Unsaved changes" : STATUS_LABELS[v.status]}</span>
          <Button type="submit" variant="primary" loading={pending} disabled={!dirty && Boolean(productId)}>
            {productId ? "Save" : "Create"}
          </Button>
        </div>
      )}
    </form>
  );
}

function RoomsField({ value, onChange, options, disabled }: { value: string[]; onChange: (v: string[]) => void; options: string[]; disabled?: boolean }) {
  const [custom, setCustom] = useState("");
  const all = [...new Set([...options, ...value])];
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-1.5 flex items-baseline gap-2 text-sm font-medium text-ink">
        Suitable rooms <span className="text-xs font-normal text-ink-faint">Optional</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {all.map((room) => {
          const on = value.includes(room);
          return (
            <button
              key={room}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((r) => r !== room) : [...value, room])}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors",
                on ? "border-copper bg-copper-soft text-copper-strong" : "border-line-strong bg-admin-surface text-ink-muted hover:bg-sunken",
              )}
            >
              {room}
              {on && <X className="size-3" aria-hidden />}
            </button>
          );
        })}
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && custom.trim()) {
              e.preventDefault();
              onChange([...new Set([...value, custom.trim()])]);
              setCustom("");
            }
          }}
          placeholder="Other… (Enter)"
          aria-label="Add another room"
          className="h-8 w-36 rounded-full border border-dashed border-line-strong bg-transparent px-3 text-sm focus:border-copper focus:outline-none"
        />
      </div>
    </fieldset>
  );
}

/** Warn before leaving with unsaved edits (tab close, reload, or a link click). */
function useUnsavedGuard(active: boolean) {
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (!activeRef.current) return;
      e.preventDefault();
    };
    const onClick = (e: MouseEvent) => {
      if (!activeRef.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || !a.href || a.href.startsWith("javascript:")) return;
      if (new URL(a.href).origin !== location.origin) return;
      if (!window.confirm("You have unsaved changes. Leave this page and lose them?")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, []);
}
