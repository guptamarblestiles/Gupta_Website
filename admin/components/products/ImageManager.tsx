"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Library, Loader2, RefreshCw, Star, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MediaPicker } from "@/components/media/MediaPicker";
import { useToast } from "@/components/ui/Toast";
import { uploadImage } from "@/lib/client/uploads";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/client/files";
import { cn } from "@/lib/cn";

const MAX_IMAGES = 12;

/**
 * A product's gallery, edited locally and saved with the product (one
 * transaction via admin_set_product_images). Removing an image here only
 * removes the product's REFERENCE; the file stays in the image library.
 */
export function ImageManager({
  value,
  onChange,
  folder,
  disabled,
  error,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  folder: string;
  disabled?: boolean;
  error?: string;
}) {
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const [replacing, setReplacing] = useState<number | null>(null);
  const [uploading, setUploading] = useState(0);
  const [failed, setFailed] = useState<File[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const upload = async (files: File[], at?: number) => {
    const room = MAX_IMAGES - value.length + (at !== undefined ? 1 : 0);
    const list = files.filter((f) => ACCEPTED_IMAGE_TYPES.includes(f.type)).slice(0, Math.max(0, room));
    if (files.length && !list.length) {
      toast({ tone: "error", title: "Choose JPG, PNG or WebP images." });
      return;
    }
    if (files.length > list.length && room > 0) toast({ tone: "info", title: `Only the first ${room} images were added (max ${MAX_IMAGES}).` });
    setUploading((n) => n + list.length);
    const added: string[] = [];
    const bad: File[] = [];
    for (const file of list) {
      try {
        const { url, reused } = await uploadImage(file, folder);
        if (reused) toast({ tone: "info", title: `“${file.name}” was already uploaded — reusing it.` });
        added.push(url);
      } catch (err) {
        bad.push(file);
        toast({ tone: "error", title: err instanceof Error ? err.message : `Couldn't upload ${file.name}` });
      } finally {
        setUploading((n) => n - 1);
      }
    }
    setFailed(bad);
    if (!added.length) return;
    if (at !== undefined) {
      const next = [...value];
      next[at] = added[0];
      onChange(next);
    } else {
      onChange([...value, ...added.filter((u) => !value.includes(u))]);
    }
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length || from === to) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div>
      {value.length > 0 && (
        <ol className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label="Product images, in display order">
          {value.map((url, i) => (
            <li
              key={url}
              draggable={!disabled}
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex !== null) move(dragIndex, i);
                setDragIndex(null);
              }}
              className={cn(
                "group relative overflow-hidden rounded-xl border bg-surface",
                i === 0 ? "border-copper ring-1 ring-copper" : "border-line",
                dragIndex === i && "opacity-50",
              )}
            >
              <div className="aspect-square bg-sunken">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Image ${i + 1}`} className="size-full object-cover" />
              </div>
              {i === 0 && (
                <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-copper px-2 py-0.5 text-[11px] font-semibold text-white">
                  <Star className="size-3 fill-current" aria-hidden /> Main image
                </span>
              )}
              {!disabled && (
                <div className="flex items-center justify-between gap-1 border-t border-line px-1.5 py-1">
                  <div className="flex">
                    <IconBtn label="Move earlier" onClick={() => move(i, i - 1)} disabled={i === 0}>
                      <ArrowUp className="size-4" />
                    </IconBtn>
                    <IconBtn label="Move later" onClick={() => move(i, i + 1)} disabled={i === value.length - 1}>
                      <ArrowDown className="size-4" />
                    </IconBtn>
                    {i !== 0 && (
                      <IconBtn label="Make main image" onClick={() => move(i, 0)}>
                        <Star className="size-4" />
                      </IconBtn>
                    )}
                  </div>
                  <div className="flex">
                    <IconBtn
                      label="Replace image"
                      onClick={() => {
                        setReplacing(i);
                        replaceInput.current?.click();
                      }}
                    >
                      <RefreshCw className="size-4" />
                    </IconBtn>
                    <IconBtn label="Remove from this product" onClick={() => onChange(value.filter((u) => u !== url))} danger>
                      <Trash2 className="size-4" />
                    </IconBtn>
                  </div>
                </div>
              )}
            </li>
          ))}
          {uploading > 0 &&
            Array.from({ length: uploading }).map((_, i) => (
              <li key={`up-${i}`} className="grid aspect-square place-items-center rounded-xl border border-dashed border-line-strong bg-surface-muted text-sm text-ink-muted">
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" /> Uploading…
                </span>
              </li>
            ))}
        </ol>
      )}

      {!disabled && value.length < MAX_IMAGES && (
        <div
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("Files")) {
              e.preventDefault();
              setDragOver(true);
            }
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            if (!e.dataTransfer.files.length) return;
            e.preventDefault();
            setDragOver(false);
            void upload([...e.dataTransfer.files]);
          }}
          className={cn(
            "flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
            dragOver ? "border-copper bg-copper-soft" : error ? "border-danger/50 bg-danger-soft/40" : "border-line-strong bg-surface-muted",
          )}
        >
          <ImagePlus className="size-6 text-ink-faint" aria-hidden />
          <p className="text-sm text-ink-muted">
            {value.length === 0 ? "Add the tile's photos. The first one is shown in the catalogue." : "Drop more photos here"}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="sm" variant="primary" icon={<Upload className="size-4" />} onClick={() => fileInput.current?.click()} loading={uploading > 0}>
              Upload photos
            </Button>
            <Button size="sm" icon={<Library className="size-4" />} onClick={() => setPickerOpen(true)}>
              From library
            </Button>
          </div>
          <p className="text-xs text-ink-faint">JPG, PNG or WebP. Resized to 1600px and optimised automatically. Phone camera works too.</p>
        </div>
      )}
      {failed.length > 0 && (
        <div className="mt-2 flex items-center gap-2 text-sm text-danger">
          {failed.length} upload{failed.length === 1 ? "" : "s"} failed.
          <Button size="sm" variant="ghost" onClick={() => void upload(failed)}>
            Retry
          </Button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-danger" role="alert">{error}</p>}

      <input
        ref={fileInput}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        multiple
        hidden
        onChange={(e) => {
          void upload([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
      <input
        ref={replaceInput}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && replacing !== null) void upload([f], replacing);
          setReplacing(null);
          e.target.value = "";
        }}
      />
      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        exclude={value}
        onPick={(urls) => {
          onChange([...value, ...urls.filter((u) => !value.includes(u))].slice(0, MAX_IMAGES));
          setPickerOpen(false);
        }}
      />
    </div>
  );
}

function IconBtn({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-8 place-items-center rounded-md text-ink-faint hover:bg-sunken disabled:opacity-30",
        danger ? "hover:text-danger" : "hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
