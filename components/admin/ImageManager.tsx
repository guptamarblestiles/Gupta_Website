/** Drag-and-drop multi-image upload + reorderable thumbnail grid for a
 *  product (max 5 images, first = primary). Upload goes through
 *  uploadProductImagesAction (webp conversion + Storage + DB insert all
 *  server-side); reordering is native HTML5 drag-and-drop over the
 *  thumbnails, persisted via reorderProductImagesAction on drop. */
"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import type { AdminProductImageRow } from "@/lib/admin/products";
import {
  uploadProductImagesAction,
  deleteProductImageAction,
  reorderProductImagesAction,
} from "@/lib/admin/formActions";

export function ImageManager({
  productId,
  slug,
  images,
}: {
  productId: string;
  slug: string;
  images: AdminProductImageRow[];
}) {
  const [items, setItems] = useState(images);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragIndex = useRef<number | null>(null);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (items.length + files.length > 5) {
      setError(`This would total ${items.length + files.length} images; max is 5.`);
      return;
    }
    setError(null);
    const formData = new FormData();
    for (const file of files) formData.append("images", file);

    startTransition(async () => {
      try {
        await uploadProductImagesAction(productId, slug, formData);
        window.location.reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed.");
      }
    });
  }

  function handleDelete(imageId: string) {
    setItems((prev) => prev.filter((i) => i.id !== imageId));
    startTransition(() => deleteProductImageAction(imageId, productId));
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex.current === null || dragIndex.current === targetIndex) return;
    const next = [...items];
    const [moved] = next.splice(dragIndex.current, 1);
    next.splice(targetIndex, 0, moved);
    setItems(next);
    dragIndex.current = null;
    startTransition(() =>
      reorderProductImagesAction(next.map((img, i) => ({ id: img.id, sort_order: i }))),
    );
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`cursor-pointer rounded border-2 border-dashed p-8 text-center text-sm ${
          isDragOver ? "border-white bg-neutral-900" : "border-neutral-700 text-neutral-400"
        }`}
      >
        {isPending ? "Working..." : "Drag images here, or click to select (max 5)"}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-5 gap-3">
          {items.map((img, index) => (
            <div
              key={img.id}
              draggable
              onDragStart={() => (dragIndex.current = index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(index)}
              className="group relative aspect-square cursor-move overflow-hidden rounded border border-neutral-700"
            >
              <Image src={img.image_url} alt="" fill sizes="200px" className="object-cover" unoptimized />
              {index === 0 && (
                <span className="absolute left-1 top-1 rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-neutral-950">
                  Primary
                </span>
              )}
              <button
                type="button"
                onClick={() => handleDelete(img.id)}
                className="absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white opacity-0 group-hover:opacity-100"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
