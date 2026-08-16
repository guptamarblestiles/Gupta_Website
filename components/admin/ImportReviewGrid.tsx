/**
 * /admin/import's review flow: scan a local folder path (server action),
 * show each auto-classified product as an editable card with its local
 * image thumbnails (served via /api/admin/import-image, never touching
 * Supabase until confirmed), and upload per-product or in bulk on confirm.
 * For the initial big batch, scripts/import/bulkImport.ts is used instead —
 * this UI is for one-off future additions.
 */
"use client";

import { useState } from "react";
import type { ScannedProduct } from "@/lib/import/scanFolder";
import { scanImportFolderAction, uploadImportedProductAction } from "@/lib/admin/importActions";

type RowStatus = "pending" | "uploading" | "done" | "error";

export function ImportReviewGrid() {
  const [rootPath, setRootPath] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [products, setProducts] = useState<ScannedProduct[]>([]);
  const [statuses, setStatuses] = useState<Record<number, { status: RowStatus; error?: string }>>({});

  async function handleScan() {
    setScanning(true);
    setScanError("");
    const result = await scanImportFolderAction(rootPath);
    setScanning(false);
    if (!result.ok) {
      setScanError(result.error);
      return;
    }
    setProducts(result.products);
    setStatuses({});
  }

  function updateField(index: number, field: keyof ScannedProduct["classification"], value: string) {
    setProducts((prev) =>
      prev.map((p, i) => (i === index ? { ...p, classification: { ...p.classification, [field]: value } } : p)),
    );
  }

  async function handleUpload(index: number) {
    setStatuses((s) => ({ ...s, [index]: { status: "uploading" } }));
    const { classification, imagePaths } = products[index];
    const result = await uploadImportedProductAction(classification, imagePaths);
    setStatuses((s) => ({
      ...s,
      [index]: result.ok ? { status: "done" } : { status: "error", error: result.error },
    }));
  }

  async function handleUploadAll() {
    for (let i = 0; i < products.length; i++) {
      if (statuses[i]?.status === "done") continue;
      await handleUpload(i);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-3">
        <div className="flex-1 space-y-1">
          <label htmlFor="rootPath" className="text-sm text-neutral-400">
            Local image folder path
          </label>
          <input
            id="rootPath"
            value={rootPath}
            onChange={(e) => setRootPath(e.target.value)}
            placeholder="/Users/you/Desktop/new-products"
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
        </div>
        <button
          onClick={handleScan}
          disabled={scanning || !rootPath.trim()}
          className="rounded bg-white px-4 py-2 text-sm font-medium text-neutral-950 disabled:opacity-50"
        >
          {scanning ? "Scanning..." : "Scan"}
        </button>
      </div>

      {scanError && (
        <p className="text-sm text-red-400" role="alert">
          {scanError}
        </p>
      )}

      {products.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-400">{products.length} products found</p>
            <button
              onClick={handleUploadAll}
              className="rounded bg-white px-4 py-2 text-sm font-medium text-neutral-950"
            >
              Upload all
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products.map((p, i) => {
              const status = statuses[i]?.status ?? "pending";
              return (
                <div key={p.classification.slug} className="rounded border border-neutral-800 p-4 space-y-3">
                  <div className="flex gap-2">
                    {p.imagePaths.map((path) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={path}
                        src={`/api/admin/import-image?path=${encodeURIComponent(path)}`}
                        alt=""
                        className="h-16 w-16 rounded object-cover"
                      />
                    ))}
                  </div>

                  {(["name", "category", "finish", "size", "color", "wallOrFloor", "collection"] as const).map(
                    (field) => (
                      <input
                        key={field}
                        value={p.classification[field]}
                        onChange={(e) => updateField(i, field, e.target.value)}
                        placeholder={field}
                        className="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs outline-none focus:border-neutral-500"
                      />
                    ),
                  )}

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleUpload(i)}
                      disabled={status === "uploading" || status === "done"}
                      className="rounded border border-neutral-700 px-3 py-1 text-xs disabled:opacity-50"
                    >
                      {status === "done" ? "Uploaded" : status === "uploading" ? "Uploading..." : "Upload"}
                    </button>
                    {status === "error" && <span className="text-xs text-red-400">{statuses[i]?.error}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
