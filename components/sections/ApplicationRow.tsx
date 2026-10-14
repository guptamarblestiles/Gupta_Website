"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

type SecondaryImage = {
  src: string;
  alt: string;
};

type ApplicationRowProps = {
  number: string;
  title: string;
  description: string;
  href: string;
  imageSrc: string;
  imageAlt: string;
  imageObjectPosition?: string;
  secondaryImage?: SecondaryImage;
  imageOnRight: boolean;
};

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * One numbered row of the Applications showcase: a huge faint hollow
 * numeral, title, one-line description, and a "View Tiles for This" link
 * on one side; the photo (plus an optional smaller overlapping second
 * photo, used only for the Homes row) with a thin offset outline frame on
 * the other. Alternates sides via `imageOnRight` (desktop only — mobile
 * always stacks image first).
 *
 * Image and text animate in as two sibling motion elements rather than
 * one parent + children, so the text's `delay` can simply be the image's
 * delay + 0.15s without any manual sequencing/orchestration.
 */
export function ApplicationRow({
  number,
  title,
  description,
  href,
  imageSrc,
  imageAlt,
  imageObjectPosition,
  secondaryImage,
  imageOnRight,
}: ApplicationRowProps) {
  const reduceMotion = useReducedMotion();
  const xOffset = imageOnRight ? 80 : -80;

  const imageInitial = reduceMotion
    ? { opacity: 1, scale: 1, x: 0 }
    : { opacity: 0, scale: 0.96, x: xOffset };
  const frameInitial = reduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: xOffset };
  const textInitial = reduceMotion
    ? { opacity: 1, y: 0 }
    : { opacity: 0, y: 40 };

  return (
    <div
      className={cn(
        "grid grid-cols-1 items-center gap-10 md:gap-14 lg:grid-cols-2 lg:gap-20",
      )}
    >
      <motion.div
        initial={imageInitial}
        whileInView={{ opacity: 1, scale: 1, x: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.8, ease: EASE }}
        className={cn("relative order-1 aspect-[4/5] md:aspect-[5/4]", imageOnRight ? "lg:order-2" : "lg:order-1")}
      >
        {/* Thin offset outline frame — a plain border rectangle behind the
            photo, shifted toward the outer edge so it peeks out on two sides. */}
        <motion.div
          aria-hidden="true"
          initial={frameInitial}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
          className={cn(
            "absolute -z-10 h-full w-full border border-outline-variant",
            imageOnRight ? "-bottom-4 -right-4" : "-bottom-4 -left-4",
          )}
        />

        <div className="relative h-full w-full overflow-hidden rounded-[8px] bg-surface-variant">
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="object-cover"
            style={{ objectPosition: imageObjectPosition }}
          />
        </div>

        {secondaryImage && (
          <motion.div
            initial={reduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.8, delay: 0.25, ease: EASE }}
            className={cn(
              "absolute bottom-[-10%] h-2/5 w-2/5 overflow-hidden rounded-[8px] shadow-feature ring-4 ring-background",
              imageOnRight ? "left-[-10%]" : "right-[-10%]",
            )}
          >
            <Image
              src={secondaryImage.src}
              alt={secondaryImage.alt}
              fill
              sizes="(min-width: 1024px) 20vw, 40vw"
              className="object-cover"
            />
          </motion.div>
        )}
      </motion.div>

      <motion.div
        initial={textInitial}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
        className={cn("order-2", imageOnRight ? "lg:order-1" : "lg:order-2")}
      >
        <span
          aria-hidden="true"
          className="block font-display text-[6rem] leading-none text-transparent md:text-[8rem]"
          style={{ WebkitTextStroke: "1.5px rgba(26,26,26,0.15)" }}
        >
          {number}
        </span>
        <h3 className="font-display text-headline-sm-mobile md:text-headline-sm text-on-surface mt-2 mb-4">
          {title}
        </h3>
        <p className="font-body text-body-lg text-on-surface-variant leading-relaxed mb-8 max-w-md">
          {description}
        </p>
        <Link
          href={href}
          className="group inline-flex items-center gap-2 font-body text-label uppercase text-on-surface transition-colors duration-500 ease-luxury hover:text-secondary"
        >
          View Tiles for This
          <ArrowUpRight size={16} aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </motion.div>
    </div>
  );
}
