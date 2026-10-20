"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { renderPage } from "@admin/lib/client/pdf";
import type { Rect } from "@admin/lib/pdf/geometry";
import type { Candidate } from "@admin/lib/catalogue/candidate";
import { cn } from "@admin/lib/cn";

const STATUS_COLOR: Record<string, string> = {
  pending: "border-copper bg-copper/10",
  created: "border-success bg-success/10",
  approved: "border-success bg-success/10",
  rejected: "border-danger/70 bg-danger/5",
  skipped: "border-ink-faint bg-ink/5",
};

/**
 * One PDF page with the found tiles outlined on top. In drawing mode the
 * reviewer drags a rectangle (mouse, pen or finger) to add a crop.
 */
export function PageCanvas({
  doc,
  pageNumber,
  candidates,
  selectedId,
  onSelect,
  drawing,
  onDrawn,
  template,
  onCanvas,
}: {
  doc: PDFDocumentProxy;
  pageNumber: number;
  candidates: Candidate[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  drawing: boolean;
  onDrawn: (rect: Rect) => void;
  template: Rect | null;
  onCanvas: (canvas: HTMLCanvasElement | null) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [width, setWidth] = useState(0);
  const [rendering, setRendering] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!width || !canvas.current) return;
    let cancelled = false;
    setRendering(true);
    setError(null);
    (async () => {
      try {
        const page = await doc.getPage(pageNumber);
        if (cancelled) return;
        const dims = await renderPage(page, canvas.current!, Math.min(width, 1100));
        if (cancelled) return;
        setSize({ w: dims.cssWidth, h: dims.cssHeight });
        onCanvas(canvas.current);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "This page couldn't be displayed.");
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, pageNumber, width]);

  const point = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  };

  const dragRect = drag && {
    x: Math.min(drag.x0, drag.x1),
    y: Math.min(drag.y0, drag.y1),
    w: Math.abs(drag.x1 - drag.x0),
    h: Math.abs(drag.y1 - drag.y0),
  };

  return (
    <div ref={wrap} className="w-full">
      <div className="relative mx-auto w-fit max-w-full overflow-hidden rounded-lg bg-white shadow-card ring-1 ring-line" style={size ? { width: size.w } : undefined}>
        <canvas ref={canvas} className="block max-w-full" aria-label={`Page ${pageNumber}`} role="img" />
        {rendering && (
          <div className="absolute inset-0 grid min-h-80 place-items-center bg-admin-surface/70">
            <Loader2 className="size-6 animate-spin text-copper" />
          </div>
        )}
        {error && <div className="grid min-h-80 place-items-center p-6 text-center text-sm text-danger">{error}</div>}

        {size && (
          <div
            className={cn("absolute inset-0", drawing && "cursor-crosshair touch-none")}
            onPointerDown={(e) => {
              if (!drawing) return;
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              const p = point(e);
              setDrag({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
            }}
            onPointerMove={(e) => {
              if (!drag) return;
              const p = point(e);
              setDrag((d) => d && { ...d, x1: p.x, y1: p.y });
            }}
            onPointerUp={() => {
              if (dragRect && dragRect.w > 0.02 && dragRect.h > 0.02) onDrawn(dragRect);
              setDrag(null);
            }}
          >
            {template && !candidates.length && (
              <div
                className="pointer-events-none absolute border-2 border-dashed border-info/70"
                style={{ left: `${template.x * 100}%`, top: `${template.y * 100}%`, width: `${template.w * 100}%`, height: `${template.h * 100}%` }}
                aria-hidden
              />
            )}
            {candidates.map((c, i) => (
              <button
                key={c.id}
                type="button"
                disabled={drawing}
                onClick={() => onSelect(c.id)}
                aria-label={`Tile ${i + 1}${c.suggested.product_code ? `, code ${c.suggested.product_code}` : ""}`}
                className={cn(
                  "absolute border-2 transition-colors",
                  STATUS_COLOR[c.status] ?? STATUS_COLOR.pending,
                  selectedId === c.id && "ring-4 ring-copper/40",
                  drawing && "pointer-events-none",
                )}
                style={{ left: `${c.crop.x * 100}%`, top: `${c.crop.y * 100}%`, width: `${c.crop.w * 100}%`, height: `${c.crop.h * 100}%` }}
              >
                <span className="absolute top-1 left-1 rounded bg-ink/80 px-1.5 py-0.5 text-[11px] font-semibold text-white">{i + 1}</span>
              </button>
            ))}
            {dragRect && (
              <div
                className="pointer-events-none absolute border-2 border-copper bg-copper/15"
                style={{ left: `${dragRect.x * 100}%`, top: `${dragRect.y * 100}%`, width: `${dragRect.w * 100}%`, height: `${dragRect.h * 100}%` }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
