import type { Product } from "@/types/product";

/** Descriptive alt text for a product's own images — "{name} {finish} {size}
 *  {category} tile" — used anywhere a product photo needs an accessible,
 *  SEO-useful description instead of just the bare product name. */
export function buildImageAlt(product: Pick<Product, "name" | "finish" | "size" | "category">): string {
  return [product.name, product.finish, product.size, product.category, "tile"]
    .filter((part) => part && part.trim().length > 0)
    .join(" ");
}
