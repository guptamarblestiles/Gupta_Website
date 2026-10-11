"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, ImageIcon, Search } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { EmptyState, Skeleton } from "@/components/ui/Display";
import { browseMedia } from "@/actions/media";
import type { MediaObject } from "@/lib/data/media";
import { cn } from "@/lib/cn";

/** Choose images already in the library (avoids uploading duplicates). */
export function MediaPicker({
  open,
  onClose,
  onPick,
  exclude,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (urls: string[]) => void;
  exclude: string[];
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<MediaObject[] | null>(null);
  const [total, setTotal] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(
      () =>
        start(async () => {
          const r = await browseMedia(q, page);
          if (r.ok && r.data) {
            setItems(r.data.items);
            setTotal(r.data.total);
            setError(null);
          } else setError(r.message);
        }),
      q ? 300 : 0,
    );
    return () => clearTimeout(t);
  }, [open, q, page]);

  return (
    <Dialog
      open={open}
      onClose={() => {
        setPicked([]);
        onClose();
      }}
      title="Choose from image library"
      description="Images already uploaded to the website. Using one again doesn't create a copy."
      size="xl"
      footer={
        <>
          <span className="mr-auto self-center text-sm text-ink-muted">{picked.length ? `${picked.length} selected` : ""}</span>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!picked.length}
            onClick={() => {
              onPick(picked);
              setPicked([]);
            }}
          >
            Add {picked.length || ""} image{picked.length === 1 ? "" : "s"}
          </Button>
        </>
      }
    >
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Search by file or folder name (e.g. a product code)"
          className="pl-9"
          aria-label="Search images"
        />
      </div>
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
      {!items ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={<ImageIcon className="size-5" />} title="No images found" />
      ) : (
        <ul className={cn("grid grid-cols-3 gap-3 sm:grid-cols-5", pending && "opacity-60")}>
          {items.map((m) => {
            const used = exclude.includes(m.url);
            const on = picked.includes(m.url);
            return (
              <li key={m.name}>
                <button
                  type="button"
                  disabled={used}
                  onClick={() => setPicked((p) => (on ? p.filter((u) => u !== m.url) : [...p, m.url]))}
                  aria-pressed={on}
                  className={cn(
                    "group relative block aspect-square w-full overflow-hidden rounded-lg border bg-sunken",
                    on ? "border-copper ring-2 ring-copper" : "border-line hover:border-line-strong",
                    used && "cursor-not-allowed opacity-40",
                  )}
                  title={m.name}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.url} alt={m.name} loading="lazy" className="size-full object-cover" />
                  {on && (
                    <span className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-copper text-white">
                      <Check className="size-4" />
                    </span>
                  )}
                  <span className="absolute inset-x-0 bottom-0 truncate bg-ink/60 px-1.5 py-0.5 text-[10px] text-white">
                    {used ? "Already added" : m.product_refs ? `Used by ${m.product_refs}` : "Unused"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {total > 30 && (
        <div className="mt-4 flex items-center justify-between text-sm text-ink-muted">
          <span>
            Page {page} of {Math.ceil(total / 30)}
          </span>
          <div className="flex gap-2">
            <Button size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button size="sm" disabled={page * 30 >= total} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
