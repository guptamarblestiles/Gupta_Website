import type { ProductFilters } from "@/types/product";

/**
 * Collection definitions for /collections/[slug].
 *
 * The product dataset does NOT have a clean "Marble Slabs / Granite Slabs /
 * GVT Tiles / Bathroom Tiles" taxonomy — `products.category` dropped that
 * fixed enum when the schema was rebuilt for the real, manually-curated
 * catalogue, and the 548 live rows use raw PDF-series names instead (e.g.
 * "12x18 D.R.TILES 1", "2x4 Parkos Carving"). Only `application`
 * (Wall/Floor) and `finish` are consistently populated across a large
 * share of the catalogue, so these five collections are built from those
 * real, well-populated facets instead of inventing categories that don't
 * exist in the data. Each maps to a genuine, non-empty product_count.
 *
 * NOTE: this means collection pages don't yet cover the "marble tiles",
 * "GVT tiles", or "bathroom tiles" keyword targets from the SEO brief —
 * that requires tagging products with those categories first (an admin/
 * data task, not a code task). Flagged in SEO_CHECKLIST.md.
 */
export interface CollectionDef {
  slug: string;
  /** Short name used in nav/footer links and breadcrumbs. */
  name: string;
  /** <h1> text — keyword + city. */
  h1: string;
  /** generateMetadata title, kept under 60 chars. */
  metaTitle: string;
  /** generateMetadata description, kept under 155 chars. */
  metaDescription: string;
  filters: ProductFilters;
  intro: string;
  faqs: { question: string; answer: string }[];
}

export const COLLECTIONS: CollectionDef[] = [
  {
    slug: "wall-tiles",
    name: "Wall Tiles",
    h1: "Wall Tiles in Delhi",
    metaTitle: "Wall Tiles in Delhi | Gupta Interior",
    metaDescription:
      "Shop wall tiles in Delhi at Gupta Interior, Mangolpur Kalan — glossy, satin and carved finishes in 300x600mm and more.",
    filters: { application: ["Wall"] },
    intro: `Wall tiles finish a space the way paint alone can't — they resist moisture, stay easy to wipe down, and give kitchens, bathrooms, and feature walls a surface that still looks new years later. At our Mangolpur Kalan showroom in Delhi, our wall tile range runs from glossy, light-reflecting finishes that open up small bathrooms to satin and carved textures that add depth to a kitchen backsplash or living room accent wall.

Most of our wall tiles come in the 300x600mm size — large enough to minimise grout lines on a full wall run, small enough to handle around switches, windows, and corners without heavy cutting. Finishes span glossy (the most common choice for wet areas, since it's easiest to clean), satin for a softer, lower-glare look, and carved or textured designs for an accent wall or feature strip.

Choosing a wall tile usually comes down to the room. Bathrooms and kitchens do best with glossy or satin finishes, since both shed water and soap scum easily — avoid heavily textured tiles there, as grout and texture can trap grime. Living rooms and bedrooms have more freedom; a carved or patterned tile works well as a single accent wall without overwhelming the room. If you're tiling floor-to-ceiling, stick to one finish throughout rather than mixing two, which tends to visually break up the wall.

Browse the wall tiles below, or visit our Delhi showroom to see finishes and sizes in person before you order — we're happy to set aside samples for a project.`,
    faqs: [
      {
        question: "What size wall tile is best for a small bathroom?",
        answer:
          "300x600mm tiles work well in most bathrooms — large enough to keep grout lines minimal, small enough to handle corners and fittings without excessive cutting. A glossy finish also helps a small bathroom feel brighter.",
      },
      {
        question: "Glossy or satin finish for a kitchen backsplash?",
        answer:
          "Glossy is the more common choice for kitchen backsplashes since it wipes clean easily and resists staining from cooking splashes. Satin is a softer-looking alternative if you want less glare under kitchen lighting.",
      },
      {
        question: "Can wall tiles be used on the floor?",
        answer:
          "No — wall tiles are generally thinner and not rated for foot traffic or the loads a floor surface needs to bear. Use our floor tile range for any flooring application.",
      },
      {
        question: "Do you have wall tile samples available at the showroom?",
        answer:
          "Yes, visit us at Shop No. B-114, Mangolpur Kalan, Pathar Market, Delhi - 110085 (Mon-Sat, 10 AM - 6 PM) and we'll show you finishes and sizes in person.",
      },
    ],
  },
  {
    slug: "floor-tiles",
    name: "Floor Tiles",
    h1: "Floor Tiles in Delhi",
    metaTitle: "Floor Tiles in Delhi | Gupta Interior",
    metaDescription:
      "Floor tiles in Delhi from Gupta Interior, Mangolpur Kalan — durable glossy and matt finishes for homes, shops and parking areas.",
    filters: { application: ["Floor"] },
    intro: `Floor tiles carry a heavier job than wall tiles — foot traffic, furniture weight, and daily wear all day, every day. Our floor range, available at the Gupta Interior showroom in Mangolpur Kalan, Delhi, is built around finishes and sizes chosen for exactly that: durability first, without giving up on the finish you want.

The collection includes glossy finishes for living rooms and showrooms where a reflective, polished look is the goal, and matt finishes for spaces where slip resistance matters more — entryways, parking areas, and high-traffic commercial floors. Sizes range from compact parking-tile formats up to larger-format tiles for open living and dining areas, where fewer grout lines read as a cleaner, more seamless floor.

A glossy floor looks sharp but can be more prone to showing scuffs and can be slippery when wet, so it suits dry indoor rooms best. Matt and textured floor tiles grip better underfoot, which is why they're the standard choice for parking areas, balconies, and any floor that sees water or heavy use. For larger rooms, go with a bigger tile format to cut down on visible grout; for smaller or irregularly shaped rooms, a mid-size tile is easier to lay without excessive cutting and wastage.

Come by our Delhi showroom to see and feel the floor tile finishes before committing — slip resistance and gloss level are both easier to judge in person than on screen.`,
    faqs: [
      {
        question: "Which floor tile finish is best for a parking area?",
        answer:
          "A matt or textured finish is the better choice for parking areas and outdoor floors — it grips better underfoot when wet than a glossy finish does.",
      },
      {
        question: "Are glossy floor tiles slippery?",
        answer:
          "Glossy floor tiles can be slippery when wet, so they're best suited to dry indoor rooms like living and dining areas rather than bathrooms, entryways, or outdoor floors.",
      },
      {
        question: "What floor tile size works best for a small room?",
        answer:
          "A mid-size tile is usually easier to lay in a small or irregular room with less cutting and wastage. Larger-format tiles suit bigger, more regularly shaped rooms where fewer grout lines matter more.",
      },
      {
        question: "Do floor tiles need a different adhesive than wall tiles?",
        answer:
          "Floor tiling typically uses a different bedding/adhesive approach to handle load-bearing and foot traffic — ask our team at the showroom for guidance suited to your specific floor tile and subfloor.",
      },
    ],
  },
  {
    slug: "porcelain-tiles",
    name: "Porcelain Tiles",
    h1: "Porcelain Tiles in Delhi",
    metaTitle: "Porcelain Tiles in Delhi | Gupta Interior",
    metaDescription:
      "Porcelain tiles in Delhi at Gupta Interior, Mangolpur Kalan — dense, low-porosity tiles for floors and walls that see heavy use.",
    filters: { category: ["Porcelain Tiles"] },
    intro: `Porcelain tiles are fired at a higher temperature and pressed denser than standard ceramic tile, which makes them less porous, harder-wearing, and more resistant to water absorption — useful anywhere spills, humidity, or heavy foot traffic are a daily reality. Our porcelain range at the Gupta Interior showroom in Mangolpur Kalan, Delhi, is sized and finished for exactly those spaces.

Because porcelain absorbs very little water, it's a dependable choice for kitchens, bathrooms, and entryways, where lesser tiles can stain or degrade over time. The density also means porcelain tends to hold up better under heavy furniture or commercial foot traffic than softer ceramic alternatives, without chipping or wearing as quickly.

When choosing porcelain, think about where it's going first. For wet areas, pick a finish with enough texture to stay safely non-slip. For living spaces and showrooms, a smoother, more polished porcelain gives a premium look that's still easy to maintain. Porcelain can also be used on both walls and floors in most cases, which makes it a practical option if you want visual continuity from floor to wall in one room.

Visit our Delhi showroom to see the porcelain range and get guidance on which finish and size suits your project.`,
    faqs: [
      {
        question: "What makes porcelain tile different from ceramic tile?",
        answer:
          "Porcelain is fired at a higher temperature and pressed denser than standard ceramic, giving it lower water absorption and better resistance to wear — which is why it holds up well in kitchens, bathrooms, and high-traffic areas.",
      },
      {
        question: "Can porcelain tile be used outdoors?",
        answer:
          "Many porcelain tiles are suitable for outdoor or semi-outdoor use thanks to their low porosity, but slip resistance and frost rating vary by tile — check with our team at the showroom for the specific product you're considering.",
      },
      {
        question: "Is porcelain tile harder to cut and install?",
        answer:
          "Porcelain's density that makes it durable also makes it harder to cut than standard ceramic, so it's best installed by an experienced tiler with the right cutting tools.",
      },
      {
        question: "Can I use the same porcelain tile on my floor and wall?",
        answer:
          "Yes, in most cases porcelain tile can be used on both floors and walls in the same room for a continuous look — ask us about which specific tiles in this collection suit both applications.",
      },
    ],
  },
  {
    slug: "glossy-finish-tiles",
    name: "Glossy Finish Tiles",
    h1: "Glossy Finish Tiles in Delhi",
    metaTitle: "Glossy Finish Tiles in Delhi | Gupta Interior",
    metaDescription:
      "Glossy finish tiles in Delhi from Gupta Interior, Mangolpur Kalan — reflective, easy-clean tiles for walls and floors.",
    filters: { finish: ["Glossy"] },
    intro: `A glossy finish is the most requested tile finish for a reason — it reflects light, makes rooms feel brighter and larger, and wipes clean without much effort. It's our largest finish category at the Gupta Interior showroom in Mangolpur Kalan, Delhi, spanning wall and floor tiles across multiple sizes and series.

The polished, light-catching surface of a glossy tile works especially well in rooms that don't get much natural light, where it helps bounce available light around rather than absorbing it the way a matt finish does. It's also the easiest finish to keep clean day to day, which is why it's such a common choice for kitchen backsplashes and bathroom walls.

There are a couple of trade-offs worth knowing before you choose glossy throughout a whole project. On floors, a glossy finish can be more slippery when wet than a matt or textured one, so it's better suited to dry living spaces than bathrooms or outdoor areas. Glossy surfaces can also show scuffs, smudges, and water spots a little more visibly than matt finishes, though regular wiping keeps this in check.

Our glossy range covers a wide mix of sizes and series — come to the showroom to see the full selection and finishes side by side with our matt range, so you can compare before deciding.`,
    faqs: [
      {
        question: "Is glossy tile good for a bathroom floor?",
        answer:
          "Glossy floor tile can be slippery when wet, so for bathroom floors we'd generally recommend a matt or textured finish instead — glossy works well on bathroom walls, though.",
      },
      {
        question: "Does glossy tile scratch easily?",
        answer:
          "Glossy tiles can show light scuffs and scratches more visibly than matt finishes simply because the reflective surface makes any mark stand out more — regular cleaning keeps this manageable.",
      },
      {
        question: "What rooms suit a glossy finish best?",
        answer:
          "Kitchens, bathroom walls, and living rooms with limited natural light all benefit from a glossy finish, since it reflects available light and helps the room feel brighter and larger.",
      },
      {
        question: "Can glossy tiles be mixed with matt tiles in one room?",
        answer:
          "Yes, a common approach is glossy walls with matt floors in the same room — it balances the brightness of glossy with the slip resistance of matt where it matters most underfoot.",
      },
    ],
  },
  {
    slug: "matt-finish-tiles",
    name: "Matt Finish Tiles",
    h1: "Matt Finish Tiles in Delhi",
    metaTitle: "Matt Finish Tiles in Delhi | Gupta Interior",
    metaDescription:
      "Matt finish tiles in Delhi at Gupta Interior, Mangolpur Kalan — slip-resistant, low-glare tiles for floors and walls.",
    filters: { finish: ["Matt", "Matte"] },
    intro: `A matt finish trades some of the shine of a glossy tile for better grip and a softer, more subdued look — which is exactly why it's the standard choice for floors that see water, heavy traffic, or both. Our matt range at the Gupta Interior showroom in Mangolpur Kalan, Delhi, covers both wall and floor applications.

Underfoot, a matt or textured surface is simply safer when wet than a glossy one, which makes it the better pick for bathroom floors, entryways, balconies, and any space prone to spills. The low-glare surface also hides water spots, dust, and light scuffs better than a polished finish — a practical advantage in busy households or commercial spaces where the floor doesn't get wiped down constantly.

Matt tiles aren't only a floor option — a matt wall tile gives a calmer, more contemporary look than glossy, and pairs well in bedrooms, studies, or feature walls where you want texture and tone rather than shine. If you're choosing between matt and glossy for a specific room, the main question is simple: does this surface need to be slip-resistant, or does it need to bounce light around a dim space? Matt wins the first; glossy wins the second.

Visit our Delhi showroom to compare the matt and glossy ranges side by side and feel the texture difference for yourself.`,
    faqs: [
      {
        question: "Why choose matt tile over glossy for a bathroom floor?",
        answer:
          "Matt tile has more grip underfoot when wet than a glossy finish, which makes it the safer choice for bathroom floors and other wet areas.",
      },
      {
        question: "Does matt tile show dirt more than glossy?",
        answer:
          "It's usually the opposite — a matt finish's low-glare surface tends to hide dust, water spots, and light scuffs better than a polished glossy surface does.",
      },
      {
        question: "Is matt tile harder to clean than glossy?",
        answer:
          "Matt tile cleans similarly to glossy for everyday dust and spills, though heavily textured matt finishes can need a bit more attention in grout lines over time.",
      },
      {
        question: "Can matt tiles be used on walls as well as floors?",
        answer:
          "Yes — a matt wall tile gives a calmer, lower-glare look than glossy and works well in bedrooms, studies, or as a feature wall finish.",
      },
    ],
  },
];

export function getCollectionBySlug(slug: string): CollectionDef | undefined {
  return COLLECTIONS.find((c) => c.slug === slug);
}
