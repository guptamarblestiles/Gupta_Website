import type { Product } from "@/types/product";
import { TileCard } from "@/components/catalogue/TileCard";

type ProductGridProps = {
  products: Product[];
};

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24 text-center">
        <p className="font-display text-headline-sm text-on-surface mb-2">No tiles match your filters</p>
        <p className="font-body text-body text-on-surface-variant">
          Try adjusting or clearing a filter to see more of the collection.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-gutter">
      {products.map((product) => (
        <TileCard key={product.id} product={product} />
      ))}
    </div>
  );
}
