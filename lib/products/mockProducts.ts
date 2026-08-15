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

/** Sizes actually present in {@link MOCK_PRODUCTS} — drives the catalogue's Size filter. */
export const CATALOGUE_SIZES = [
  "300 x 600 mm",
  "600 x 600 mm",
  "600 x 1200 mm",
  "800 x 1600 mm",
  "1200 x 2400 mm",
  "1600 x 3200 mm",
  "1800 x 3600 mm",
] as const;

const now = "2026-01-01T00:00:00.000Z";

/**
 * Full catalogue dataset (brief section 44 / task 7). Includes the four
 * FEATURED_STONES products (same slug/productCode) so a card looks
 * identical whether it's reached from the homepage or the catalogue grid.
 * `imageUrl` is left empty — nothing renders it yet (TileCard falls back to
 * a StoneSwatch placeholder), but the field stays on every row so a real
 * Supabase Storage URL is a value change, not a shape change.
 */
export const MOCK_PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Honey Onyx",
    slug: "honey-onyx",
    productCode: "DRT-ON-104",
    category: "Marble Slabs",
    finish: "Polished",
    size: "1200 x 2400 mm",
    description: "Warm honey-toned onyx with dramatic backlit veining, polished to a mirror finish.",
    imageUrl: "",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "2",
    name: "Nero Marquina",
    slug: "nero-marquina",
    productCode: "DRT-MB-212",
    category: "Marble Slabs",
    finish: "Polished",
    size: "1200 x 2400 mm",
    description: "Deep black marble threaded with fine white veining — a statement stone for bold interiors.",
    imageUrl: "",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "3",
    name: "Verde Alpi",
    slug: "verde-alpi",
    productCode: "DRT-MB-338",
    category: "Marble Slabs",
    finish: "Honed",
    size: "1200 x 2400 mm",
    description: "Rich forest-green marble with soft honed texture, ideal for feature walls.",
    imageUrl: "",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "4",
    name: "Statuario Puro",
    slug: "statuario-puro",
    productCode: "DRT-MB-401",
    category: "Marble Slabs",
    finish: "Polished",
    size: "1600 x 3200 mm",
    description: "Classic Italian white marble with bold grey veining, book-matched for grand-format slabs.",
    imageUrl: "",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "5",
    name: "Calacatta Gold",
    slug: "calacatta-gold",
    productCode: "DRT-MB-455",
    category: "Marble Slabs",
    finish: "Polished",
    size: "1600 x 3200 mm",
    description: "Luminous white marble with golden veining, quarried and matched for statement surfaces.",
    imageUrl: "",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "6",
    name: "Emperador Dark",
    slug: "emperador-dark",
    productCode: "DRT-MB-509",
    category: "Marble Slabs",
    finish: "Leathered",
    size: "1200 x 2400 mm",
    description: "Chocolate-brown marble with fine textured veining, given a tactile leathered surface.",
    imageUrl: "",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "7",
    name: "Absolute Black",
    slug: "absolute-black",
    productCode: "DRT-GR-101",
    category: "Granite Slabs",
    finish: "Polished",
    size: "1200 x 2400 mm",
    description: "Uniform jet-black granite, engineered for high-traffic architectural work.",
    imageUrl: "",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "8",
    name: "Tan Brown",
    slug: "tan-brown",
    productCode: "DRT-GR-118",
    category: "Granite Slabs",
    finish: "Polished",
    size: "1800 x 3600 mm",
    description: "Warm brown granite with dark speckled grain, dense and durable for countertops and floors.",
    imageUrl: "",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "9",
    name: "Kashmir White",
    slug: "kashmir-white",
    productCode: "DRT-GR-134",
    category: "Granite Slabs",
    finish: "Honed",
    size: "1200 x 2400 mm",
    description: "Pale granite with burgundy and grey flecks, honed for a soft, low-glare surface.",
    imageUrl: "",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "10",
    name: "Steel Grey",
    slug: "steel-grey",
    productCode: "DRT-GR-152",
    category: "Granite Slabs",
    finish: "Leathered",
    size: "1800 x 3600 mm",
    description: "Cool grey granite with a fine, even grain, leathered for a matte tactile finish.",
    imageUrl: "",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "11",
    name: "Alaska White",
    slug: "alaska-white",
    productCode: "DRT-GR-167",
    category: "Granite Slabs",
    finish: "Polished",
    size: "1200 x 2400 mm",
    description: "Crisp white granite with grey and gold mineral flecks, polished to a high shine.",
    imageUrl: "",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "12",
    name: "Black Galaxy",
    slug: "black-galaxy",
    productCode: "DRT-GR-179",
    category: "Granite Slabs",
    finish: "Honed",
    size: "1800 x 3600 mm",
    description: "Black granite flecked with copper-gold crystal, honed for a soft galaxy-like shimmer.",
    imageUrl: "",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "13",
    name: "Carrara Vein GVT",
    slug: "carrara-vein-gvt",
    productCode: "DRT-GV-201",
    category: "GVT Tiles",
    finish: "Polished",
    size: "600 x 1200 mm",
    description: "Vitrified tile reproducing Carrara marble's grey veining, polished to a refined uniform finish.",
    imageUrl: "",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "14",
    name: "Concrete Grey GVT",
    slug: "concrete-grey-gvt",
    productCode: "DRT-GV-214",
    category: "GVT Tiles",
    finish: "Matte",
    size: "800 x 1600 mm",
    description: "Large-format matte tile with an industrial poured-concrete texture.",
    imageUrl: "",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "15",
    name: "Travertino Sand GVT",
    slug: "travertino-sand-gvt",
    productCode: "DRT-GV-228",
    category: "GVT Tiles",
    finish: "Honed",
    size: "600 x 600 mm",
    description: "Sand-toned vitrified tile with a soft travertine pore pattern, honed underfoot.",
    imageUrl: "",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "16",
    name: "Onyx Wave GVT",
    slug: "onyx-wave-gvt",
    productCode: "DRT-GV-241",
    category: "GVT Tiles",
    finish: "Polished",
    size: "800 x 1600 mm",
    description: "Book-matched onyx-effect vitrified tile with flowing amber wave patterning.",
    imageUrl: "",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "17",
    name: "Basalt Ash GVT",
    slug: "basalt-ash-gvt",
    productCode: "DRT-GV-256",
    category: "GVT Tiles",
    finish: "Matte",
    size: "600 x 1200 mm",
    description: "Charcoal-grey vitrified tile with a fine matte basalt texture.",
    imageUrl: "",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "18",
    name: "Coastal Grey Bath",
    slug: "coastal-grey-bath",
    productCode: "DRT-BT-301",
    category: "Bathroom Tiles",
    finish: "Matte",
    size: "300 x 600 mm",
    description: "Water-resistant matte tile in a cool coastal grey, sized for spa-grade wet areas.",
    imageUrl: "",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "19",
    name: "Aegean Wave Bath",
    slug: "aegean-wave-bath",
    productCode: "DRT-BT-314",
    category: "Bathroom Tiles",
    finish: "Polished",
    size: "600 x 600 mm",
    description: "Polished blue-grey tile with a subtle wave-like surface movement.",
    imageUrl: "",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "20",
    name: "Sandstone Mist Bath",
    slug: "sandstone-mist-bath",
    productCode: "DRT-BT-329",
    category: "Bathroom Tiles",
    finish: "Honed",
    size: "300 x 600 mm",
    description: "Warm sand-toned tile with a honed, slip-resistant surface for showers and floors.",
    imageUrl: "",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "21",
    name: "Pearl Terrazzo Bath",
    slug: "pearl-terrazzo-bath",
    productCode: "DRT-BT-342",
    category: "Bathroom Tiles",
    finish: "Matte",
    size: "600 x 600 mm",
    description: "Elegant terrazzo-effect tile flecked with pearl and stone chips, matte-finished.",
    imageUrl: "",
    createdAt: now,
    updatedAt: now,
  },
];
