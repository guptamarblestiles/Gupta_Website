"use client";

/**
 * Full-screen in-page PDF viewer. The PDF is large (tens of MB), so the
 * <iframe> is NOT mounted until the user clicks "Open preview" — merely
 * opening the modal costs nothing. Uses the browser's native PDF renderer
 * via an <iframe> rather than pulling in pdf.js — every target browser
 * (Chrome/Firefox/Safari/Edge, desktop and mobile) already ships one, so
 * this gets scrolling, zoom, search, and text selection for free with zero
 * extra JS weight. Body scroll is locked while open and restored to
 * exactly where the user was on close (no scroll-jump back to top).
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Download, Eye } from "lucide-react";

type CataloguePDFViewerProps = {
  title: string;
  pdfUrl: string;
  /** Optional file size in bytes, shown in the pre-preview state when known. */
  fileSizeBytes?: number;
  onClose: () => void;
};

function formatSize(bytes?: number): string | undefined {
  if (!bytes) return undefined;
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function CataloguePDFViewer({ title, pdfUrl, fileSizeBytes, onClose }: CataloguePDFViewerProps) {
  const scrollYRef = useRef(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const size = formatSize(fileSizeBytes);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    scrollYRef.current = window.scrollY;
    const { style } = document.body;
    const prevPosition = style.position;
    const prevTop = style.top;
    const prevWidth = style.width;

    style.position = "fixed";
    style.top = `-${scrollYRef.current}px`;
    style.width = "100%";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      style.position = prevPosition;
      style.top = prevTop;
      style.width = prevWidth;
      window.scrollTo(0, scrollYRef.current);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed inset-0 z-[200] flex flex-col bg-hero-bg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 16, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="flex h-full flex-col"
        >
          <header className="flex items-center justify-between gap-4 border-b border-hero-border px-4 py-3 sm:px-6">
            <h2 className="truncate font-display text-base text-hero-foreground sm:text-lg">{title}</h2>
            <div className="flex shrink-0 items-center gap-2">
              <a
                href={pdfUrl}
                download
                className="flex items-center gap-2 border border-hero-border px-3 py-2 font-body text-label uppercase text-hero-foreground transition-colors duration-500 ease-luxury hover:border-secondary hover:text-secondary"
              >
                <Download size={16} aria-hidden="true" />
                <span className="hidden sm:inline">Download</span>
              </a>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close catalogue viewer"
                className="flex items-center justify-center border border-hero-border p-2 text-hero-foreground transition-colors duration-500 ease-luxury hover:border-secondary hover:text-secondary"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 bg-neutral-900">
            {previewOpen ? (
              <iframe src={`${pdfUrl}#view=FitH`} title={title} className="h-full w-full" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
                <div>
                  <p className="font-display text-xl text-hero-foreground">{title}</p>
                  <p className="mt-2 font-body text-sm text-hero-muted">
                    {size ? `PDF · ${size} — ` : "Large PDF — "}
                    preview loads the whole file, so it is opened only on request.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(true)}
                    className="flex items-center gap-2 border border-hero-border px-5 py-3 font-body text-label uppercase text-hero-foreground transition-colors duration-500 ease-luxury hover:border-secondary hover:text-secondary"
                  >
                    <Eye size={16} aria-hidden="true" />
                    Open preview
                  </button>
                  <a
                    href={pdfUrl}
                    download
                    rel="nofollow noopener noreferrer"
                    className="flex items-center gap-2 border border-hero-border px-5 py-3 font-body text-label uppercase text-hero-foreground transition-colors duration-500 ease-luxury hover:border-secondary hover:text-secondary"
                  >
                    <Download size={16} aria-hidden="true" />
                    Download
                  </a>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
