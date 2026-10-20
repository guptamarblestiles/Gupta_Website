"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CheckCircle2, FileUp, Loader2, RotateCcw, Sparkles, TriangleAlert } from "lucide-react";
import { Button, LinkButton } from "@admin/components/ui/Button";
import { Field, Input } from "@admin/components/ui/Field";
import { Notice } from "@admin/components/ui/Display";
import { completePdfUpload, markPdfUploadFailed, preparePdfUpload } from "@admin/actions/pdfs";
import { looksLikePdf, sha256Hex, uploadWithProgress } from "@admin/lib/client/files";
import { readPdfInfo } from "@admin/lib/client/pdf";
import { titleFromFileName, formatBytes } from "@admin/lib/catalogue/normalize";
import { MAX_PDF_MB } from "@admin/lib/env";
import { cn } from "@admin/lib/cn";

type Step =
  | { kind: "idle" }
  | { kind: "checking"; label: string }
  | { kind: "ready"; pageCount: number }
  | { kind: "uploading"; progress: number }
  | { kind: "finishing" }
  | { kind: "done"; id: string; title: string; existing: boolean; renamedTo?: string }
  | { kind: "error"; message: string; retryable: boolean };

/**
 * Guided upload: validate → read page count/title → hash → reserve record →
 * upload with progress → verify → done. Each step says what it's doing, and
 * failures keep the chosen file so "Retry" doesn't mean starting over.
 */
export function PdfUploader({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<{ pageCount: number; sha: string } | null>(null);
  const [title, setTitle] = useState("");
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const [dragOver, setDragOver] = useState(false);

  const choose = async (f: File) => {
    setFile(f);
    setInfo(null);
    if (!/\.pdf$/i.test(f.name) && f.type !== "application/pdf") {
      return setStep({ kind: "error", message: "That isn't a PDF file.", retryable: false });
    }
    if (f.size > MAX_PDF_MB * 1024 * 1024) {
      return setStep({
        kind: "error",
        message: `This PDF is ${formatBytes(f.size)}. The storage limit is ${MAX_PDF_MB} MB per file — save a compressed (“reduced size”) copy and upload that.`,
        retryable: false,
      });
    }
    try {
      setStep({ kind: "checking", label: "Checking the file…" });
      if (!(await looksLikePdf(f))) throw new Error("This file is named .pdf but isn't a real PDF.");
      const data = await f.arrayBuffer();
      setStep({ kind: "checking", label: "Reading pages…" });
      const meta = await readPdfInfo(data).catch(() => {
        throw new Error("This PDF couldn't be opened. It may be damaged or password-protected.");
      });
      setStep({ kind: "checking", label: "Preparing…" });
      const sha = await sha256Hex(data);
      setInfo({ pageCount: meta.pageCount, sha });
      setTitle(meta.title && !/untitled|microsoft|^\d+$/i.test(meta.title) ? meta.title : titleFromFileName(f.name));
      setStep({ kind: "ready", pageCount: meta.pageCount });
    } catch (err) {
      setStep({ kind: "error", message: err instanceof Error ? err.message : "The file couldn't be read.", retryable: false });
    }
  };

  const upload = async () => {
    if (!file || !info) return;
    let recordId: string | null = null;
    try {
      setStep({ kind: "finishing" });
      const prep = await preparePdfUpload({ sha256: info.sha, filename: file.name, size: file.size, pageCount: info.pageCount, title });
      if (!prep.ok) throw Object.assign(new Error(prep.message), { retryable: false });
      const d = prep.data!;
      if (d.kind === "existing") {
        setStep({ kind: "done", id: d.id, title: d.title, existing: true });
        return;
      }
      recordId = d.id;
      if (d.signedUrl) {
        setStep({ kind: "uploading", progress: 0 });
        await uploadWithProgress(d.signedUrl, file, "application/pdf", (p) => setStep({ kind: "uploading", progress: p }));
      }
      setStep({ kind: "finishing" });
      const done = await completePdfUpload(d.id);
      if (!done.ok) throw new Error(done.message);
      setStep({ kind: "done", id: d.id, title, existing: false, renamedTo: d.renamedTo });
      router.refresh();
    } catch (err) {
      if (recordId) await markPdfUploadFailed(recordId).catch(() => {});
      const retryable = (err as { retryable?: boolean }).retryable !== false;
      setStep({ kind: "error", message: err instanceof Error ? err.message : "Upload failed.", retryable });
    }
  };

  const reset = () => {
    setFile(null);
    setInfo(null);
    setTitle("");
    setStep({ kind: "idle" });
  };

  if (step.kind === "done") {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden />
        <div>
          <p className="text-lg font-semibold">{step.existing ? "Already in your library" : "Upload complete"}</p>
          <p className="mt-1 text-sm text-ink-muted">
            {step.existing ? `This exact file is already saved as “${step.title}”. Nothing was duplicated.` : `“${step.title}” is saved and ready.`}
            {step.renamedTo && ` A different PDF already had this file name, so it was saved as “${step.renamedTo}”.`}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <LinkButton href={`/admin/pdfs/${step.id}/import`} variant="primary" icon={<Sparkles className="size-4" />}>
            Find products in this PDF
          </LinkButton>
          <LinkButton href={`/admin/pdfs/${step.id}`}>Open details</LinkButton>
          <Button
            variant="ghost"
            onClick={() => {
              reset();
              onDone?.();
            }}
          >
            Upload another
          </Button>
        </div>
      </div>
    );
  }

  const busy = step.kind === "checking" || step.kind === "uploading" || step.kind === "finishing";

  return (
    <div className="space-y-4">
      {!file || step.kind === "idle" ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) void choose(f);
          }}
          className={cn(
            "flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
            dragOver ? "border-copper bg-copper-soft" : "border-line-strong bg-admin-surface-muted",
          )}
        >
          <FileUp className="size-8 text-copper" aria-hidden />
          <div>
            <p className="font-medium text-ink">Drop a brand catalogue PDF here</p>
            <p className="mt-0.5 text-sm text-ink-muted">or choose it from this device. Up to {MAX_PDF_MB} MB.</p>
          </div>
          <Button variant="primary" onClick={() => input.current?.click()}>
            Choose PDF
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-line bg-admin-surface-muted p-4">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-danger-soft text-xs font-bold text-danger">PDF</div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{file.name}</p>
              <p className="text-sm text-ink-muted">
                {formatBytes(file.size)}
                {info && ` · ${info.pageCount} page${info.pageCount === 1 ? "" : "s"}`}
              </p>
            </div>
            {!busy && (
              <Button size="sm" variant="ghost" onClick={reset}>
                Change
              </Button>
            )}
          </div>

          {step.kind === "checking" && (
            <p className="mt-3 flex items-center gap-2 text-sm text-ink-muted">
              <Loader2 className="size-4 animate-spin" /> {step.label}
            </p>
          )}

          {(step.kind === "ready" || step.kind === "error" || step.kind === "uploading" || step.kind === "finishing") && info && (
            <div className="mt-4">
              <Field label="Title in the library" htmlFor="pdf-title" hint="Shown to staff, and to customers next to the download button. You can change it later.">
                <Input id="pdf-title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} />
              </Field>
            </div>
          )}

          {step.kind === "uploading" && (
            <div className="mt-4" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(step.progress * 100)} aria-label="Upload progress">
              <div className="h-2 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-copper transition-[width]" style={{ width: `${Math.max(2, step.progress * 100)}%` }} />
              </div>
              <p className="mt-1.5 text-sm text-ink-muted">Uploading… {Math.round(step.progress * 100)}% — keep this page open.</p>
            </div>
          )}
          {step.kind === "finishing" && (
            <p className="mt-3 flex items-center gap-2 text-sm text-ink-muted">
              <Loader2 className="size-4 animate-spin" /> Saving to the library…
            </p>
          )}
        </div>
      )}

      {step.kind === "error" && (
        <Notice tone="danger">
          <span className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span className="flex-1">{step.message}</span>
          </span>
        </Notice>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {step.kind === "error" && step.retryable && info && (
          <Button variant="primary" icon={<RotateCcw className="size-4" />} onClick={() => void upload()}>
            Retry upload
          </Button>
        )}
        {step.kind === "error" && !step.retryable && (
          <Button onClick={reset}>Choose another file</Button>
        )}
        {step.kind === "ready" && (
          <Button variant="primary" onClick={() => void upload()} disabled={!title.trim()}>
            Upload to library
          </Button>
        )}
      </div>

      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void choose(f);
          e.target.value = "";
        }}
      />
      <p className="text-xs text-ink-faint">
        The original file is stored unchanged. If a PDF is too large, save a “reduced size” copy from your PDF app — the pages stay the same.
      </p>
    </div>
  );
}
