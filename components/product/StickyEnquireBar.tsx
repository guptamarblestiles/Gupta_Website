/**
 * Mobile-only sticky bottom bar linking to the enquiry form further down
 * the product page — keeps the CTA reachable without scrolling back up on
 * long product pages. Hidden on desktop (md+), where the inline "Enquire"
 * button near the top is already in view without much scrolling.
 */
import Link from "next/link";

export function StickyEnquireBar() {
  return (
    <div className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant bg-background/95 backdrop-blur-xl px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <Link
        href="#enquire"
        className="flex w-full items-center justify-center bg-secondary px-6 py-3 font-body text-label uppercase tracking-widest text-white truncate"
      >
        Enquire About This Tile
      </Link>
    </div>
  );
}
