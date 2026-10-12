/**
 * Mobile-only sticky bottom bar linking to the enquiry form further down
 * the product page — keeps the CTA reachable without scrolling back up on
 * long product pages. Hidden on desktop (md+), where the inline "Enquire"
 * button near the top is already in view without much scrolling.
 */
import { Button } from "@/components/ui/Button";

export function StickyEnquireBar() {
  return (
    <div className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant bg-background/95 backdrop-blur-xl px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <Button href="#enquire" variant="primary" className="w-full truncate">
        Enquire About This Tile
      </Button>
    </div>
  );
}
