"use client";

/**
 * "Explore Our Catalogue" card — communicates "there's a complete
 * collection behind this" via a layered document-depth effect (two
 * offset ghost sheets behind the main face) rather than any flashy motion.
 * Hover treatment mirrors TileCard's lift + shadow so it reads as the same
 * design system, not a bolted-on new pattern.
 */
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FileText, ArrowRight } from "lucide-react";
import type { Catalogue } from "@/lib/catalogues/queries";
import { CataloguePDFViewer } from "@/components/catalogue/CataloguePDFViewer";

export function CatalogueCard({ catalogue }: { catalogue: Catalogue }) {
  const [isOpen, setIsOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group relative block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
      >
        {/* Ghost sheets behind the main face — subtle "there's more pages
            here" depth cue, purely decorative (aria-hidden). */}
        <span
          aria-hidden="true"
          className="absolute inset-0 translate-x-2 translate-y-2 rounded-sm bg-surface-variant/60 transition-transform duration-500 ease-out group-hover:translate-x-3 group-hover:translate-y-3"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 translate-x-1 translate-y-1 rounded-sm bg-surface-variant/80 transition-transform duration-500 ease-out group-hover:translate-x-1.5 group-hover:translate-y-1.5"
        />

        <motion.div
          className="relative flex flex-col overflow-hidden rounded-sm bg-surface shadow-md"
          whileHover={reduceMotion ? undefined : { y: -4 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-hero-bg">
            {catalogue.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, no next/image loader configured for it
              <img
                src={catalogue.thumbnailUrl}
                alt=""
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              />
            ) : (
              <FileText
                size={56}
                strokeWidth={1}
                className="text-hero-muted transition-transform duration-500 ease-out group-hover:scale-110"
                aria-hidden="true"
              />
            )}
          </div>

          <div className="p-card">
            <h3 className="font-display text-headline-sm-mobile md:text-headline-sm-tablet text-on-surface mb-1">
              {catalogue.title}
            </h3>
            {catalogue.description && (
              <p className="font-body text-body text-on-surface-variant mb-4 line-clamp-2">
                {catalogue.description}
              </p>
            )}
            <span className="inline-flex items-center gap-2 font-body text-label uppercase tracking-widest text-secondary-strong">
              View Catalogue
              <ArrowRight
                size={16}
                aria-hidden="true"
                className="transition-transform duration-300 ease-out group-hover:translate-x-1"
              />
            </span>
          </div>
        </motion.div>
      </button>

      {isOpen && (
        <CataloguePDFViewer
          title={catalogue.title}
          pdfUrl={catalogue.pdfUrl}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
