"use client";

import Image from "next/image";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Award, Gem, Handshake, Wrench, type LucideIcon } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

type HighlightItem = {
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  stat?: string;
};

const ICONS: Record<string, LucideIcon> = {
  "Premium Materials": Gem,
  "Certified Quality": Award,
  "Custom Solutions": Wrench,
  "Expert Support": Handshake,
};

/** One offset per tile (8 total: 4 image tiles + 4 text tiles), each
 *  entering from a different direction, in the order the tiles appear
 *  (column by column, top to bottom) — same device as
 *  ApplicationsCollage's TILES. */
const FROM: { x?: number; y?: number }[] = [
  { x: -70 }, // 1 Premium Materials image — from left
  { y: 70 }, // 2 Premium Materials text — from bottom
  { y: -70 }, // 3 Certified Quality text — from top
  { x: 70 }, // 4 Certified Quality image — from right
  { x: -60, y: -60 }, // 5 Custom Solutions image — from top-left
  { x: 60, y: 60 }, // 6 Custom Solutions text — from bottom-right
  { x: 60, y: -60 }, // 7 Expert Support text — from top-right
  { x: -60, y: 60 }, // 8 Expert Support image — from bottom-left
];

function tileVariants(index: number, reduceMotion: boolean | null): Variants {
  const from = FROM[index];
  return {
    hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, ...from },
    show: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: { duration: 0.7, delay: index * 0.08, ease: EASE },
    },
  };
}

/**
 * Bento grid of 4 independent columns (desktop) — each column is one
 * highlight (photo + its copy), alternating which sits on top so the row
 * reads as a checkerboard rather than a repeating pattern. Deliberately
 * NOT a 2-row CSS grid: a fixed-height flex row lets the image/text split
 * per column be asymmetric (1.6:1) while still fitting one screen.
 */
export function HighlightsGrid({ items }: { items: readonly HighlightItem[] }) {
  const reduceMotion = useReducedMotion();
  const [premium, certified, custom, expert] = items;

  return (
    <>
      {/* Desktop (md+): 4 columns, fixed-height row, image/text split 1.6:1 */}
      <div className="mx-auto hidden h-[min(530px,68vh)] max-w-[1180px] gap-4 md:flex">
        <Column>
          <ImageTile item={premium} index={0} reduceMotion={reduceMotion} flexClass="flex-[1.6]" />
          <TextTile item={premium} index={1} reduceMotion={reduceMotion} flexClass="flex-1" />
        </Column>
        <Column>
          <TextTile item={certified} index={2} reduceMotion={reduceMotion} flexClass="flex-1" />
          <ImageTile item={certified} index={3} reduceMotion={reduceMotion} flexClass="flex-[1.6]" />
        </Column>
        <Column>
          <ImageTile item={custom} index={4} reduceMotion={reduceMotion} flexClass="flex-[1.6]" />
          <TextTile item={custom} index={5} reduceMotion={reduceMotion} flexClass="flex-1" />
        </Column>
        <Column>
          <TextTile item={expert} index={6} reduceMotion={reduceMotion} flexClass="flex-1" />
          <ImageTile item={expert} index={7} reduceMotion={reduceMotion} flexClass="flex-[1.6]" />
        </Column>
      </div>

      {/* Mobile (<md): 2-column grid, same pairing, auto height */}
      <div className="grid grid-cols-2 gap-3 md:hidden">
        <ImageTile item={premium} index={0} reduceMotion={reduceMotion} aspect="aspect-[4/5]" mobile />
        <TextTile item={premium} index={1} reduceMotion={reduceMotion} mobile />
        <TextTile item={certified} index={2} reduceMotion={reduceMotion} mobile />
        <ImageTile item={certified} index={3} reduceMotion={reduceMotion} aspect="aspect-[4/5]" mobile />
        <ImageTile item={custom} index={4} reduceMotion={reduceMotion} aspect="aspect-[4/5]" mobile />
        <TextTile item={custom} index={5} reduceMotion={reduceMotion} mobile />
        <TextTile item={expert} index={6} reduceMotion={reduceMotion} mobile />
        <ImageTile item={expert} index={7} reduceMotion={reduceMotion} aspect="aspect-[4/5]" mobile />
      </div>
    </>
  );
}

function Column({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full flex-1 flex-col gap-4">{children}</div>;
}

function ImageTile({
  item,
  index,
  reduceMotion,
  flexClass,
  aspect,
  mobile,
}: {
  item: HighlightItem;
  index: number;
  reduceMotion: boolean | null;
  flexClass?: string;
  aspect?: string;
  mobile?: boolean;
}) {
  return (
    <motion.div
      variants={tileVariants(index, reduceMotion)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-10%" }}
      className={`relative overflow-hidden bg-surface-variant ${mobile ? "rounded-2xl" : "rounded-[28px]"} ${flexClass ?? ""} ${aspect ?? ""}`}
    >
      <Image
        src={item.imageSrc}
        alt={item.imageAlt}
        fill
        sizes="(min-width: 768px) 25vw, 50vw"
        className="object-cover"
      />
    </motion.div>
  );
}

function TextTile({
  item,
  index,
  reduceMotion,
  flexClass,
  mobile,
}: {
  item: HighlightItem;
  index: number;
  reduceMotion: boolean | null;
  flexClass?: string;
  mobile?: boolean;
}) {
  const Icon = ICONS[item.title] ?? Gem;

  return (
    <motion.div
      variants={tileVariants(index, reduceMotion)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-10%" }}
      className={`flex flex-col items-start justify-start overflow-hidden bg-white text-left ${mobile ? "rounded-2xl p-4" : "rounded-[28px] p-6"} ${flexClass ?? ""}`}
    >
      {item.stat ? (
        <span className="mb-2 font-display text-2xl text-secondary-strong">{item.stat}</span>
      ) : (
        <Icon size={24} className="mb-2 text-secondary-strong" aria-hidden="true" />
      )}
      <h3 className="font-body text-base md:text-lg font-semibold text-on-surface mb-1.5">{item.title}</h3>
      <p className="font-body text-sm text-on-surface-variant leading-relaxed">{item.description}</p>
    </motion.div>
  );
}
