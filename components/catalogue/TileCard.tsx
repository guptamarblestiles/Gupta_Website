import Image from "next/image";
import Link from "next/link";
import { StoneSwatch } from "@/components/ui/StoneSwatch";
import { PriceDisplay } from "@/components/product/PriceDisplay";
import { getStoneForProduct } from "@/lib/products/stone";
import type { Product } from "@/types/product";

type TileCardProps = {
  product: Product;
  /** True for cards in the first visible row — preloads the image via a
   *  <link> in <head> so the LCP image starts fetching immediately
   *  (Next.js 16: `priority` is deprecated in favor of `preload`). */
  preload?: boolean;
};

/**
 * Catalogue grid card. Micro-interactions (lift, image scale, "View
 * Details" reveal) mirror the homepage FeaturedCollection card exactly —
 * brief section 18 calls for a single consistent hover treatment site-wide.
 * Renders the product's real photo when imageUrl is set (live Supabase
 * data); mock data leaves imageUrl empty, so it falls back to the
 * StoneSwatch placeholder.
 */
export function TileCard({ product, preload = false }: TileCardProps) {
  const stone = getStoneForProduct(product);

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col bg-surface transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
    >
      <div className="relative aspect-square overflow-hidden">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            preload={preload}
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
          />
        ) : (
          <StoneSwatch
            stone={stone}
            className="absolute inset-0 h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.05]"
          />
        )}
        <div className="absolute inset-0 flex items-end justify-start p-5 bg-gradient-to-t from-black/45 via-black/0 to-black/0 opacity-0 transition-opacity duration-400 group-hover:opacity-100">
          <span className="font-body text-label uppercase tracking-widest text-white">View Details</span>
        </div>
      </div>
      <div className="p-card">
        <p className="font-body text-label uppercase tracking-widest text-secondary-strong mb-2">
          {product.category}
        </p>
        <h3 className="font-display text-headline-sm-mobile md:text-headline-sm-tablet lg:text-headline-sm text-on-surface mb-1">{product.name}</h3>
        <p className="font-body text-body text-on-surface-variant">
          {product.finish} &middot; {product.size}
        </p>
        <PriceDisplay
          price={product.price}
          priceUnit={product.priceUnit}
          priceNote={product.priceNote}
          className="mt-2 font-body text-body text-on-surface"
        />
      </div>
    </Link>
  );
}
