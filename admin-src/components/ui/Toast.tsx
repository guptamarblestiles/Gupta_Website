"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@admin/lib/cn";

type ToastTone = "success" | "error" | "info";
type ToastItem = { id: number; tone: ToastTone; title: string; detail?: string };

const ToastContext = createContext<(t: Omit<ToastItem, "id">) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

/** Show the outcome of a server action: one call, honest message. */
export function useResultToast() {
  const toast = useToast();
  return useCallback(
    (r: { ok: boolean; message: string }, detail?: string) =>
      toast({ tone: r.ok ? "success" : "error", title: r.message, detail }),
    [toast],
  );
}

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((t: Omit<ToastItem, "id">) => {
    const id = nextId++;
    setItems((list) => [...list.slice(-3), { ...t, id }]);
    // Errors stay until dismissed; everything else fades on its own.
    if (t.tone !== "error") setTimeout(() => setItems((list) => list.filter((i) => i.id !== id)), 6000);
  }, []);
  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <FlashFromUrl />
      <div aria-live="polite" className="pointer-events-none fixed inset-x-3 bottom-3 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:items-end">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm animate-fade-in items-start gap-3 rounded-xl border bg-admin-surface px-4 py-3 shadow-pop",
              t.tone === "error" ? "border-danger/30" : "border-line",
            )}
          >
            {t.tone === "success" ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
            ) : t.tone === "error" ? (
              <TriangleAlert className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
            ) : (
              <Info className="mt-0.5 size-5 shrink-0 text-info" aria-hidden />
            )}
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium text-ink">{t.title}</p>
              {t.detail && <p className="mt-0.5 text-ink-muted">{t.detail}</p>}
            </div>
            <button
              type="button"
              onClick={() => setItems((list) => list.filter((i) => i.id !== t.id))}
              className="-mr-1 rounded p-1 text-ink-faint hover:bg-sunken hover:text-ink"
              aria-label="Dismiss"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Pages redirected to after an action carry ?flash=<message>; show it once and clean the URL. */
function FlashFromUrl() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const flash = params.get("flash");
  const flashError = params.get("flashError");
  useEffect(() => {
    if (!flash && !flashError) return;
    toast({ tone: flashError ? "error" : "success", title: (flashError ?? flash)! });
    const next = new URLSearchParams(params);
    next.delete("flash");
    next.delete("flashError");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [flash, flashError, params, pathname, router, toast]);
  return null;
}
