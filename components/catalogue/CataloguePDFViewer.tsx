"use client";

/**
 * Full-screen in-page PDF viewer. Uses the browser's native PDF renderer
 * via an <iframe> rather than pulling in pdf.js — every target browser
 * (Chrome/Firefox/Safari/Edge, desktop and mobile) already ships one, so
 * this gets scrolling, zoom, search, and text selection for free with zero
 * extra JS weight. Body scroll is locked while open and restored to
 * exactly where the user was on close (no scroll-jump back to top).
 */
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Download } from "lucide-react";

type CataloguePDFViewerProps = {
  title: string;
  pdfUrl: string;
  onClose: () => void;
};

export function CataloguePDFViewer({ title, pdfUrl, onClose }: CataloguePDFViewerProps) {
  const scrollYRef = useRef(0);

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
                className="flex items-center gap-2 rounded border border-hero-border px-3 py-2 font-body text-label uppercase tracking-widest text-hero-foreground transition-colors duration-300 hover:border-secondary hover:text-secondary"
              >
                <Download size={16} aria-hidden="true" />
                <span className="hidden sm:inline">Download</span>
              </a>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close catalogue viewer"
                className="flex items-center justify-center rounded border border-hero-border p-2 text-hero-foreground transition-colors duration-300 hover:border-secondary hover:text-secondary"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 bg-neutral-900">
            <iframe src={`${pdfUrl}#view=FitH`} title={title} className="h-full w-full" />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
