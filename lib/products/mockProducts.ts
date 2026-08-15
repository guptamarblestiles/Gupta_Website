import type { StoneType } from "@/components/ui/StoneSwatch";
import type { Product, ProductCategory } from "@/types/product";

/**
 * Typed mock dataset (brief section 44) — lets the UI be built end-to-end
 * before a real Supabase project/schema exists. Kept isolated in
 * lib/products/ so swapping this module's callers over to
 * lib/products/queries.ts (real Supabase reads, task 8) is a drop-in change
 * rather than a UI rewrite.
 */

export type CategoryShowcase = {
  category: ProductCategory;
  label: string;
  description: string;
  stone: StoneType;
  href: string;
};

/** Homepage "Category row" — brief section 6 / approved Stitch structure. */
export const CATEGORY_SHOWCASE: CategoryShowcase[] = [
  {
    category: "Marble Slabs",
    label: "Marble Slabs",
    description: "Timeless natural veining, quarried and matched for statement surfaces.",
    stone: "marble",
    href: "/products?category=Marble+Slabs",
  },
  {
    category: "Granite Slabs",
    label: "Granite Slabs",
    description: "Dense, durable stone engineered for high-traffic architectural work.",
    stone: "granite",
    href: "/products?category=Granite+Slabs",
  },
  {
    category: "GVT Tiles",
    label: "GVT Tiles",
    description: "Vitrified precision tiles with a refined, uniform finish.",
    stone: "gvt",
    href: "/products?category=GVT+Tiles",
  },
  {
    category: "Bathroom Tiles",
    label: "Bathroom Tiles",
    description: "Water-resistant, elegant surfaces for spa-grade interiors.",
    stone: "bathroom",
    href: "/products?category=Bathroom+Tiles",
  },
];

export type FeaturedStone = Pick<
  Product,
  "name" | "slug" | "productCode" | "category" | "finish" | "size"
> & { stone: StoneType };

/**
 * Homepage "Featured Collection — The Masterpiece Selection" (4 items,
 * locked in from the approved Stitch homepage prototype). Slugs match the
 * eventual /products/[slug] route so links stay correct once the Product
 * Detail page (task 10) exists.
 */
export const FEATURED_STONES: FeaturedStone[] = [
  {
    name: "Honey Onyx",
    slug: "honey-onyx",
    productCode: "DRT-ON-104",
    category: "Marble Slabs",
    finish: "Polished",
    size: "1200 x 2400 mm",
    stone: "onyx-honey",
  },
  {
    name: "Nero Marquina",
    slug: "nero-marquina",
    productCode: "DRT-MB-212",
    category: "Marble Slabs",
    finish: "Polished",
    size: "1200 x 2400 mm",
    stone: "nero-marquina",
  },
  {
    name: "Verde Alpi",
    slug: "verde-alpi",
    productCode: "DRT-MB-338",
    category: "Marble Slabs",
    finish: "Honed",
    size: "1200 x 2400 mm",
    stone: "verde-alpi",
  },
  {
    name: "Statuario Puro",
    slug: "statuario-puro",
    productCode: "DRT-MB-401",
    category: "Marble Slabs",
    finish: "Polished",
    size: "1600 x 3200 mm",
    stone: "statuario",
  },
];

export const TRUST_STATS = [
  { value: "25+", label: "Years of Excellence" },
  { value: "5,000+", label: "Projects Delivered" },
  { value: "04", label: "Premium Showrooms" },
  { value: "ISO", label: "Certified Quality" },
] as const;
