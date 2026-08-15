import Link from "next/link";
import { StoneSwatch } from "@/components/ui/StoneSwatch";
import { getStoneForProduct } from "@/lib/products/stone";
import type { Product } from "@/types/product";

type TileCardProps = {
  product: Product;
};

/**
 * Catalogue grid card. Micro-interactions (lift, image scale, "View
 * Details" reveal) mirror the homepage FeaturedCollection card exactly —
 * brief section 18 calls for a single consistent hover treatment site-wide.
 */
export function TileCard({ product }: TileCardProps) {
  const stone = getStoneForProduct(product);

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col bg-surface transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
    >
      <div className="relative aspect-square overflow-hidden">
        <StoneSwatch
          stone={stone}
          className="absolute inset-0 h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.05]"
        />
        <div className="absolute inset-0 flex items-end justify-start p-5 bg-gradient-to-t from-black/45 via-black/0 to-black/0 opacity-0 transition-opacity duration-400 group-hover:opacity-100">
          <span className="font-body text-label uppercase tracking-widest text-white">View Details</span>
        </div>
      </div>
      <div className="p-5">
        <p className="font-body text-label uppercase tracking-widest text-secondary-strong mb-2">
          {product.category}
        </p>
        <h3 className="font-display text-headline-sm text-on-surface mb-1">{product.name}</h3>
        <p className="font-body text-body text-on-surface-variant">
          {product.finish} &middot; {product.size}
        </p>
      </div>
    </Link>
  );
}
