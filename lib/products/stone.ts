import type { StoneType } from "@/components/ui/StoneSwatch";
import type { Product, ProductCategory } from "@/types/product";

const CATEGORY_STONE: Record<ProductCategory, StoneType> = {
  "Marble Slabs": "marble",
  "Granite Slabs": "granite",
  "GVT Tiles": "gvt",
  "Bathroom Tiles": "bathroom",
};

// A few catalogue slugs reuse the distinct named swatches already approved
// for the homepage's Featured Collection, so those products look identical
// wherever they appear. Everything else falls back to its category swatch.
const NAMED_STONE: Partial<Record<string, StoneType>> = {
  "honey-onyx": "onyx-honey",
  "nero-marquina": "nero-marquina",
  "verde-alpi": "verde-alpi",
  "statuario-puro": "statuario",
};

/** Shared by TileCard and the product detail gallery so a product's
 *  placeholder swatch is identical everywhere it appears. */
export function getStoneForProduct(product: Pick<Product, "slug" | "category">): StoneType {
  return NAMED_STONE[product.slug] ?? CATEGORY_STONE[product.category];
}
