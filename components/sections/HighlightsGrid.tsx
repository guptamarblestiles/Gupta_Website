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
};

const ICONS: Record<string, LucideIcon> = {
  "Premium Materials": Gem,
  "Certified Quality": Award,
  "Custom Solutions": Wrench,
  "Expert Support": Handshake,
};

/** One offset per grid cell (8 total: 4 image tiles + 4 text tiles), each
 *  entering from a different direction so the reveal doesn't read as a
 *  single repeated animation — same device as ApplicationsCollage's TILES. */
const FROM: { x?: number; y?: number }[] = [
  { x: -70 }, // 1 Premium Materials image — from left
  { y: -70 }, // 2 Premium Materials text — from top
  { x: 70 }, // 3 Custom Solutions image — from right
  { y: 70 }, // 4 Custom Solutions text — from bottom
  { x: -60, y: 60 }, // 5 Certified Quality text — from bottom-left
  { x: 60, y: -60 }, // 6 Certified Quality image — from top-right
  { x: -60, y: -60 }, // 7 Expert Support text — from top-left
  { x: 60, y: 60 }, // 8 Expert Support image — from bottom-right
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
 * Bento grid: 4 columns x 2 rows on desktop (lg:grid-cols-4, 8 cells fall
 * into 2 rows automatically), 2 columns on tablet, 1 column on mobile —
 * DOM order alone produces the right row-major layout at every
 * breakpoint, so no explicit grid-column/row placement is needed. Image
 * and text tiles for the same highlight are adjacent but never in the
 * same visual "slot" twice in a row, giving the checkerboard look:
 * row 1 is image/text/image/text, row 2 is text/image/text/image.
 */
export function HighlightsGrid({ items }: { items: readonly HighlightItem[] }) {
  const reduceMotion = useReducedMotion();
  const [premium, certified, custom, expert] = items;

  const cells = [
    <ImageTile key="premium-img" item={premium} index={0} reduceMotion={reduceMotion} aspect="aspect-[4/3]" />,
    <TextTile key="premium-text" item={premium} index={1} reduceMotion={reduceMotion} />,
    <ImageTile key="custom-img" item={custom} index={2} reduceMotion={reduceMotion} aspect="aspect-[4/3]" />,
    <TextTile key="custom-text" item={custom} index={3} reduceMotion={reduceMotion} />,
    <TextTile key="certified-text" item={certified} index={4} reduceMotion={reduceMotion} />,
    <ImageTile key="certified-img" item={certified} index={5} reduceMotion={reduceMotion} aspect="aspect-[3/4]" />,
    <TextTile key="expert-text" item={expert} index={6} reduceMotion={reduceMotion} />,
    <ImageTile key="expert-img" item={expert} index={7} reduceMotion={reduceMotion} aspect="aspect-[3/4]" />,
  ];

  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{cells}</div>;
}

function ImageTile({
  item,
  index,
  reduceMotion,
  aspect,
}: {
  item: HighlightItem;
  index: number;
  reduceMotion: boolean | null;
  aspect: string;
}) {
  return (
    <motion.div
      variants={tileVariants(index, reduceMotion)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-10%" }}
      className={`relative overflow-hidden rounded-3xl bg-surface-variant ${aspect}`}
    >
      <Image
        src={item.imageSrc}
        alt={item.imageAlt}
        fill
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-on-surface/30 to-transparent" />
      <span className="absolute bottom-4 left-4 rounded-full bg-background/90 px-3 py-1.5 font-body text-label uppercase text-on-surface shadow-sm backdrop-blur">
        {item.title}
      </span>
    </motion.div>
  );
}

function TextTile({
  item,
  index,
  reduceMotion,
}: {
  item: HighlightItem;
  index: number;
  reduceMotion: boolean | null;
}) {
  const Icon = ICONS[item.title] ?? Gem;

  return (
    <motion.div
      variants={tileVariants(index, reduceMotion)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-10%" }}
      className="flex flex-col justify-center rounded-3xl bg-surface-variant p-6 md:p-8"
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center bg-secondary/10 text-secondary">
        <Icon size={20} aria-hidden="true" />
      </div>
      <h3 className="font-display text-headline-sm-mobile md:text-headline-sm text-on-surface mb-2">
        {item.title}
      </h3>
      <p className="font-body text-body text-on-surface-variant leading-relaxed">{item.description}</p>
    </motion.div>
  );
}
