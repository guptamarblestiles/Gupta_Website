"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Crop,
  Loader2,
  ScanSearch,
  Settings2,
  Square,
  StopCircle,
  Wand2,
} from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { Button, LinkButton } from "@admin/components/ui/Button";
import { Badge, Card, CardHeader, Notice } from "@admin/components/ui/Display";
import { Checkbox, Field, Input, Select } from "@admin/components/ui/Field";
import { useToast } from "@admin/components/ui/Toast";
import { PageCanvas } from "@admin/components/import/PageCanvas";
import { CandidateCard, type ApproveChoice } from "@admin/components/import/CandidateCard";
import { openPdf, type OpenPdf } from "@admin/lib/client/pdf";
import { cropManual, scanPage, snapOnCanvas } from "@admin/lib/client/scan";
import { approveCandidate, deleteCandidate, findExistingCodes, saveCandidates, updateCandidate } from "@admin/actions/imports";
import type { Candidate, CandidateValues } from "@admin/lib/catalogue/candidate";
import { APPLICATIONS } from "@admin/lib/catalogue/product";
import type { Rect } from "@admin/lib/pdf/geometry";
import { cn } from "@admin/lib/cn";

type Defaults = CandidateValues & { namePrefix?: string | null };
const DEFAULT_KEYS: { key: keyof Defaults; label: string; list?: string }[] = [
  { key: "namePrefix", label: "Name prefix", list: undefined },
  { key: "category", label: "Category", list: "category" },
  { key: "size", label: "Size", list: "size" },
  { key: "finish", label: "Finish", list: "finish" },
  { key: "thickness", label: "Thickness", list: "thickness" },
  { key: "material", label: "Material", list: "material" },
  { key: "series", label: "Collection", list: "series" },
];

/**
 * Per-device convenience settings (this PDF's layout box and defaults).
 * Falls back to memory when storage is blocked (private mode), so the page
 * still works — the values just aren't remembered.
 */
const memoryStore = new Map<string, string>();
function readStore(key: string): string | null {
  try {
    return localStorage.getItem(key) ?? memoryStore.get(key) ?? null;
  } catch {
    return memoryStore.get(key) ?? null;
  }
}
function useLocal<T>(key: string, initial: T): [T, (v: T) => void] {
  const subscribe = useCallback(
    (cb: () => void) => {
      const onEvent = (e: Event) => (!(e instanceof StorageEvent) || e.key === key) && cb();
      window.addEventListener("storage", onEvent);
      window.addEventListener(`local:${key}`, onEvent);
      return () => {
        window.removeEventListener("storage", onEvent);
        window.removeEventListener(`local:${key}`, onEvent);
      };
    },
    [key],
  );
  const raw = useSyncExternalStore(subscribe, () => readStore(key), () => null);
  const value = useMemo<T>(() => {
    try {
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw]);
  const set = useCallback(
    (v: T) => {
      const s = JSON.stringify(v);
      memoryStore.set(key, s);
      try {
        localStorage.setItem(key, s);
      } catch {
        /* storage blocked — memory copy is enough for this visit */
      }
      window.dispatchEvent(new Event(`local:${key}`));
    },
    [key],
  );
  return [value, set];
}

export function ImportWorkspace({
  pdf,
  initialCandidates,
  suggestions,
}: {
  pdf: { id: string; slug: string; title: string; file_url: string; page_count: number | null };
  initialCandidates: Candidate[];
  suggestions: Record<string, string[]>;
}) {
  const toast = useToast();
  const [open, setOpen] = useState<OpenPdf | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(() => initialCandidates.find((c) => c.status === "pending")?.page ?? 1);
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [selected, setSelected] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [needsBox, setNeedsBox] = useState<Set<number>>(new Set());
  const [scan, setScan] = useState<{ running: boolean; done: number; total: number } | null>(null);
  const stopRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [template, setTemplate] = useLocal<Rect | null>(`import-template:${pdf.id}`, null);
  const [defaults, setDefaults] = useLocal<Defaults>(`import-defaults:${pdf.id}`, {});
  const [useOcr, setUseOcr] = useLocal<boolean>("import-ocr", true);
  const [showDefaults, setShowDefaults] = useState(false);
  const [view, setView] = useState<"page" | "pending">("page");
  const [dupes, setDupes] = useState<Record<string, { id: string; name: string }>>({});

  const numPages = open?.doc.numPages ?? pdf.page_count ?? 0;
  const doc: PDFDocumentProxy | null = open?.doc ?? null;

  useEffect(() => {
    let current: OpenPdf | null = null;
    openPdf({ url: pdf.file_url })
      .then((o) => {
        current = o;
        setOpen(o);
      })
      .catch(() => setLoadError("The PDF couldn't be loaded. Check your connection and reload the page."));
    return () => {
      void current?.close();
    };
  }, [pdf.file_url]);

  // Duplicate-code check for everything still awaiting review.
  const pendingCodes = useMemo(
    () => candidates.filter((c) => c.status === "pending").map((c) => (c.suggested.product_code ?? "").toUpperCase()).filter(Boolean).sort().join("|"),
    [candidates],
  );
  useEffect(() => {
    if (!pendingCodes) return;
    let cancelled = false;
    findExistingCodes(pendingCodes.split("|")).then((d) => !cancelled && setDupes(d));
    return () => {
      cancelled = true;
    };
  }, [pendingCodes]);

  const byPage = useMemo(() => {
    const m = new Map<number, Candidate[]>();
    for (const c of candidates) m.set(c.page, [...(m.get(c.page) ?? []), c]);
    return m;
  }, [candidates]);
  const pageCandidates = byPage.get(page) ?? [];
  const pending = candidates.filter((c) => c.status === "pending");
  const listed = view === "page" ? pageCandidates : pending;
  const created = candidates.filter((c) => c.status === "created").length;

  const merge = (rows: Candidate[]) =>
    setCandidates((list) => {
      const m = new Map(list.map((c) => [c.id, c]));
      for (const r of rows) m.set(r.id, r);
      return [...m.values()].sort((a, b) => a.page - b.page || a.crop.y - b.crop.y || a.crop.x - b.crop.x);
    });

  const scanOne = async (n: number) => {
    if (!doc) return;
    const res = await scanPage({ doc, pageNumber: n, pdfSlug: pdf.slug, template, useOcr });
    setNeedsBox((s) => {
      const next = new Set(s);
      if (res.needsBox) next.add(n);
      else next.delete(n);
      return next;
    });
    if (res.items.length) {
      const saved = await saveCandidates(pdf.id, res.items);
      if (!saved.ok) throw new Error(saved.message);
      merge(saved.data ?? []);
    }
    return res;
  };

  const scanThisPage = async () => {
    setBusy(true);
    try {
      const res = await scanOne(page);
      if (!res) return;
      if (res.needsBox) toast({ tone: "info", title: "This page is one flat picture.", detail: "Draw a box around the tile once — then use “Use this box on every page”." });
      else if (!res.items.length) toast({ tone: "info", title: "No tiles found on this page." });
      else toast({ tone: "success", title: `Found ${res.items.length} tile${res.items.length === 1 ? "" : "s"} on page ${page}.`, detail: res.usedOcr ? "Text was read from the picture (OCR) — check it." : undefined });
    } catch (err) {
      toast({ tone: "error", title: err instanceof Error ? err.message : "Scanning failed." });
    } finally {
      setBusy(false);
    }
  };

  const scanAll = async (onlyUnscanned: boolean) => {
    if (!doc) return;
    stopRef.current = false;
    const pages = Array.from({ length: numPages }, (_, i) => i + 1).filter((n) => !onlyUnscanned || !(byPage.get(n)?.length));
    setScan({ running: true, done: 0, total: pages.length });
    let found = 0;
    let failed = 0;
    for (const [i, n] of pages.entries()) {
      if (stopRef.current) break;
      setPage(n);
      try {
        found += (await scanOne(n))?.items.length ?? 0;
      } catch {
        failed++;
      }
      setScan({ running: true, done: i + 1, total: pages.length });
    }
    setScan(null);
    toast({
      tone: failed ? "error" : "success",
      title: stopRef.current ? `Stopped. Found ${found} tiles so far — they're saved.` : `Finished. Found ${found} tile${found === 1 ? "" : "s"}.`,
      detail: failed ? `${failed} page${failed === 1 ? "" : "s"} couldn't be scanned. Try them one at a time.` : undefined,
    });
  };

  const onDrawn = async (raw: Rect) => {
    if (!doc) return;
    setDrawing(false);
    setBusy(true);
    try {
      const rect = canvasRef.current ? snapOnCanvas(canvasRef.current, raw) : raw;
      const cand = await cropManual({ doc, pageNumber: page, pdfSlug: pdf.slug, rect, useOcr });
      const saved = await saveCandidates(pdf.id, [cand]);
      if (!saved.ok) throw new Error(saved.message);
      merge(saved.data ?? []);
      setNeedsBox((s) => {
        const next = new Set(s);
        next.delete(page);
        return next;
      });
      const newest = (saved.data ?? []).filter((c) => c.page === page && c.detection === "manual").sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
      if (newest) setSelected(newest.id);
      toast({ tone: "success", title: "Crop added.", detail: "Edges were snapped to the tile. Check the preview." });
    } catch (err) {
      toast({ tone: "error", title: err instanceof Error ? err.message : "Couldn't add that crop." });
    } finally {
      setBusy(false);
    }
  };

  const withBusy = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      toast({ tone: "error", title: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setBusy(false);
    }
  };

  const approve = (c: Candidate, values: CandidateValues, choice: ApproveChoice) =>
    withBusy(async () => {
      const r = await approveCandidate(c.id, { values: clean(values), defaults: clean(defaults), status: choice.status, existingProductId: choice.existingProductId });
      if (!r.ok) {
        toast({ tone: "error", title: r.message });
        return;
      }
      merge([{ ...c, status: "created", product_id: r.data!.productId, suggested: values }]);
      toast({ tone: "success", title: r.message });
      const next = pending.find((p) => p.id !== c.id && (view === "pending" || p.page === page));
      if (next) setSelected(next.id);
    });

  const selectedCandidate = candidates.find((c) => c.id === selected);
  const templateFromSelected = () => {
    if (!selectedCandidate) return;
    setTemplate(selectedCandidate.crop);
    toast({ tone: "success", title: "Box saved as this PDF's layout.", detail: "“Find tiles on all pages” will now use it on single-picture pages, snapped to each tile." });
  };

  if (loadError) return <Notice tone="danger">{loadError}</Notice>;

  return (
    <div className="space-y-4">
      {Object.entries(suggestions).map(([key, list]) => (
        <datalist id={`dl-${key}`} key={key}>
          {list.slice(0, 200).map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      ))}

      {/* Toolbar */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" aria-label="Previous page" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || Boolean(scan)}>
              <ChevronLeft className="size-4" />
            </Button>
            <label className="sr-only" htmlFor="page-select">
              Page
            </label>
            <Select id="page-select" value={page} onChange={(e) => setPage(Number(e.target.value))} className="h-8 w-36 text-sm" disabled={!numPages || Boolean(scan)}>
              {Array.from({ length: numPages }, (_, i) => i + 1).map((n) => {
                const list = byPage.get(n) ?? [];
                const open = list.filter((c) => c.status === "pending").length;
                return (
                  <option key={n} value={n}>
                    Page {n}
                    {list.length ? ` · ${open ? `${open} to review` : "done"}` : needsBox.has(n) ? " · needs box" : ""}
                  </option>
                );
              })}
            </Select>
            <Button size="sm" variant="ghost" aria-label="Next page" onClick={() => setPage((p) => Math.min(numPages, p + 1))} disabled={page >= numPages || Boolean(scan)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <div className="mx-1 hidden h-6 w-px bg-line sm:block" />
          <Button size="sm" variant="primary" icon={<ScanSearch className="size-4" />} onClick={scanThisPage} loading={busy && !scan} disabled={!doc || Boolean(scan) || busy}>
            Find tiles on this page
          </Button>
          <Button size="sm" icon={<Wand2 className="size-4" />} onClick={() => scanAll(true)} disabled={!doc || Boolean(scan) || busy}>
            Find on all pages
          </Button>
          <Button size="sm" variant={drawing ? "subtle" : "secondary"} icon={<Crop className="size-4" />} onClick={() => setDrawing((d) => !d)} disabled={!doc || Boolean(scan) || busy} aria-pressed={drawing}>
            {drawing ? "Drag on the page…" : "Draw a box"}
          </Button>
          <Button size="sm" variant="ghost" icon={<Settings2 className="size-4" />} onClick={() => setShowDefaults((s) => !s)} aria-expanded={showDefaults}>
            PDF defaults
          </Button>
          <div className="ml-auto text-sm text-ink-muted">
            {created} created · {pending.length} to review
          </div>
        </div>

        {scan && (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1" role="progressbar" aria-valuemin={0} aria-valuemax={scan.total} aria-valuenow={scan.done} aria-label="Scanning pages">
              <div className="h-2 overflow-hidden rounded-full bg-line">
                <div className="h-full bg-copper transition-[width]" style={{ width: `${(scan.done / Math.max(1, scan.total)) * 100}%` }} />
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                Scanning page {Math.min(scan.done + 1, scan.total)} of {scan.total}. This runs in this browser tab — if you close it the scan stops, but everything found so far is kept.
              </p>
            </div>
            <Button size="sm" icon={<StopCircle className="size-4" />} onClick={() => (stopRef.current = true)}>
              Stop
            </Button>
          </div>
        )}

        {showDefaults && (
          <div className="mt-3 border-t border-line pt-3">
            <p className="mb-3 text-sm text-ink-muted">
              Values that are the same for every tile in this PDF. They fill any field left empty on a tile when you create the product. Saved on this device.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {DEFAULT_KEYS.map((d) => (
                <Field key={d.key} label={d.label} htmlFor={`def-${d.key}`} hint={d.key === "namePrefix" ? "Name = prefix + code when no name is found" : undefined}>
                  <Input
                    id={`def-${d.key}`}
                    value={defaults[d.key] ?? ""}
                    list={d.list ? `dl-${d.list}` : undefined}
                    onChange={(e) => setDefaults({ ...defaults, [d.key]: e.target.value })}
                    className="h-9 text-sm"
                  />
                </Field>
              ))}
              <Field label="Application" htmlFor="def-application">
                <Select id="def-application" value={defaults.application ?? ""} onChange={(e) => setDefaults({ ...defaults, application: e.target.value || null })} className="h-9 text-sm">
                  <option value="">—</option>
                  {APPLICATIONS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Checkbox className="mt-3" label="Read text printed inside pictures (OCR) when a page has no text layer" checked={useOcr} onChange={(e) => setUseOcr(e.target.checked)} />
            <p className="mt-1 text-xs text-ink-faint">The first use downloads the text reader (~15 MB) once. Results are suggestions and are always shown for checking.</p>
          </div>
        )}
      </Card>

      {needsBox.size > 0 && !template && (
        <Notice tone="info" title={`${needsBox.size} page${needsBox.size === 1 ? " is" : "s are"} one flat picture`}>
          Draw a box around the main tile on one of them, select the crop, and press “Use this box on every page”. Each page then gets its own crop, snapped to the tile&apos;s edges.
        </Notice>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="min-w-0 space-y-3">
          {doc ? (
            <PageCanvas
              doc={doc}
              pageNumber={page}
              candidates={pageCandidates}
              selectedId={selected}
              onSelect={(id) => {
                setSelected(id);
                document.getElementById(`cand-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
              }}
              drawing={drawing}
              onDrawn={onDrawn}
              template={template}
              onCanvas={(c) => (canvasRef.current = c)}
            />
          ) : (
            <div className="grid min-h-96 place-items-center rounded-xl border border-line bg-admin-surface">
              <span className="flex items-center gap-2 text-sm text-ink-muted">
                <Loader2 className="size-4 animate-spin" /> Opening PDF…
              </span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {selectedCandidate && selectedCandidate.page === page && (
              <Button size="sm" icon={<Square className="size-4" />} onClick={templateFromSelected}>
                Use this box on every page
              </Button>
            )}
            {template && (
              <>
                <Badge tone="info">Layout box saved</Badge>
                <Button size="sm" variant="ghost" onClick={() => setTemplate(null)}>
                  Clear
                </Button>
                <Button size="sm" variant="ghost" onClick={() => scanAll(false)} disabled={Boolean(scan) || busy}>
                  Re-scan all pages
                </Button>
              </>
            )}
          </div>
        </div>

        <Card className="self-start xl:sticky xl:top-20">
          <CardHeader
            title={view === "page" ? `Tiles on page ${page}` : "All tiles to review"}
            action={
              <div className="flex rounded-lg bg-sunken p-0.5 text-xs">
                {(["page", "pending"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setView(v)}
                    className={cn("rounded-md px-2.5 py-1", view === v ? "bg-admin-surface font-medium shadow-card" : "text-ink-muted")}
                    aria-pressed={view === v}
                  >
                    {v === "page" ? "This page" : `To review (${pending.length})`}
                  </button>
                ))}
              </div>
            }
          />
          <div className="max-h-[calc(100dvh-14rem)] space-y-3 overflow-y-auto p-3">
            {listed.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-ink-muted">
                {view === "page"
                  ? needsBox.has(page)
                    ? "This page is a single picture. Draw a box around the tile."
                    : "Nothing found here yet. Press “Find tiles on this page”, or draw a box."
                  : "Everything has been reviewed."}
              </p>
            ) : (
              listed.map((c) => (
                <CandidateCard
                  key={c.id}
                  index={(byPage.get(c.page) ?? []).indexOf(c)}
                  candidate={c}
                  defaults={defaults}
                  duplicate={dupes[(c.suggested.product_code ?? "").toUpperCase()] ?? null}
                  selected={selected === c.id}
                  busy={busy}
                  onSelect={() => {
                    setSelected(c.id);
                    if (c.page !== page && !scan) setPage(c.page);
                  }}
                  onSaveValues={(values) =>
                    void updateCandidate(c.id, { values: clean(values) }).then((r) => r.ok && r.data && merge([r.data]))
                  }
                  onApprove={(values, choice) => approve(c, values, choice)}
                  onStatus={(status) =>
                    withBusy(async () => {
                      const r = await updateCandidate(c.id, { status });
                      if (!r.ok) throw new Error(r.message);
                      merge([r.data!]);
                    })
                  }
                  onDelete={() =>
                    withBusy(async () => {
                      const r = await deleteCandidate(c.id);
                      if (!r.ok) throw new Error(r.message);
                      setCandidates((list) => list.filter((x) => x.id !== c.id));
                    })
                  }
                />
              ))
            )}
          </div>
          {created > 0 && (
            <div className="border-t border-line p-3 text-sm">
              <LinkButton href={`/admin/products?pdf=${pdf.id}&status=review`} size="sm" className="w-full">
                Review &amp; publish the {created} created product{created === 1 ? "" : "s"}
              </LinkButton>
              <p className="mt-2 text-center text-xs text-ink-faint">
                Imported products start as <strong>Needs review</strong> and are never published automatically.{" "}
                <Link href={`/admin/pdfs/${pdf.id}`} className="underline">
                  PDF details
                </Link>
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function clean(values: CandidateValues | Defaults): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(values)) out[k] = v == null || String(v).trim() === "" ? null : String(v).trim();
  return out;
}
