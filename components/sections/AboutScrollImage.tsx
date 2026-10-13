"use client";

import { useRef, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

type AboutScrollImageProps = {
  /** Kicker + heading + paragraph + CTA button — authored server-side,
   *  just animated (fade + move up) by this client wrapper. */
  children: React.ReactNode;
  imageSrc: string;
  imageAlt: string;
  label: string;
  exploreHref: string;
};

const MOBILE_QUERY = "(max-width: 767px)";

function subscribeToMobileQuery(callback: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getMobileSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

/** Server snapshot is "desktop" (false) — the 440px desktop start width is
 *  the safer default if a mobile client briefly renders it before
 *  hydration settles, since it just means a moment of fixed-px sizing
 *  rather than fighting mobile's percentage-based layout. */
function getServerSnapshot() {
  return false;
}

/**
 * Pins the section (tall wrapper + sticky inner panel) while the image
 * below the heading grows from a small rounded/circular frame to the
 * full content width, border-radius easing from fully round to 24px and
 * the image itself zooming slightly (1.0 -> 1.08). The heading/paragraph
 * fade and move up over the first part of the scroll range so the image
 * has visually "taken over" before the expansion finishes — at which
 * point the sticky panel's wrapper ends and the pin releases on its own
 * (same mechanism the homepage's other scroll-pin section uses: a tall
 * wrapper + `offset: ["start start", "end end"]`, no extra JS needed to
 * "release" anything).
 *
 * Only `transform`/`opacity`/`clip-path`/dimensions tied to `scale`+
 * `border-radius` are animated — no layout-triggering properties besides
 * the container's own width/height, which only this element reflows.
 */
export function AboutScrollImage({
  children,
  imageSrc,
  imageAlt,
  label,
  exploreHref,
}: AboutScrollImageProps) {
  const reduceMotion = useReducedMotion();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isMobile = useSyncExternalStore(subscribeToMobileQuery, getMobileSnapshot, getServerSnapshot);

  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ["start start", "end end"],
  });

  const textOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0]);
  const textY = useTransform(scrollYProgress, [0, 0.4], [0, -40]);

  // Every pair below shares one CSS unit across its whole range — framer
  // motion's useTransform can't interpolate between mismatched units
  // (e.g. "420px" -> "100%"), it silently pairs the start number with the
  // end unit instead, which rendered as a full-width box from scroll 0.
  const frameWidth = useTransform(scrollYProgress, [0, 1], [isMobile ? "85%" : "33%", "100%"]);
  const frameHeight = useTransform(scrollYProgress, [0, 1], [isMobile ? "38vh" : "44vh", isMobile ? "55vh" : "65vh"]);
  const frameRadius = useTransform(scrollYProgress, [0, 1], ["500px", "24px"]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);

  if (reduceMotion) {
    return (
      <div className="flex flex-col items-center">
        <div className="mb-10 max-w-2xl text-center">{children}</div>
        <div className="relative aspect-[16/10] w-full max-w-4xl overflow-hidden rounded-3xl">
          <Image src={imageSrc} alt={imageAlt} fill sizes="100vw" className="object-cover" />
          <ImageOverlay label={label} exploreHref={exploreHref} />
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative h-[150vh] md:h-[200vh]">
      <div className="sticky top-0 flex h-screen w-full flex-col items-center justify-center overflow-hidden px-margin">
        <motion.div
          style={{ opacity: textOpacity, y: textY }}
          className="mb-6 max-w-2xl text-center"
        >
          {children}
        </motion.div>

        <motion.div
          style={{
            width: frameWidth,
            height: frameHeight,
            borderRadius: frameRadius,
          }}
          className="relative mx-auto overflow-hidden"
        >
          <motion.div style={{ scale: imageScale }} className="absolute inset-0">
            <Image
              src={imageSrc}
              alt={imageAlt}
              fill
              sizes="(min-width: 768px) 1600px, 100vw"
              className="object-cover"
            />
          </motion.div>
          <ImageOverlay label={label} exploreHref={exploreHref} />
        </motion.div>
      </div>
    </div>
  );
}

function ImageOverlay({ label, exploreHref }: { label: string; exploreHref: string }) {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent"
      />
      <span className="absolute left-4 top-4 z-10 rounded-full bg-background/90 px-4 py-1.5 font-body text-xs font-medium uppercase tracking-wide text-on-surface backdrop-blur-sm">
        {label}
      </span>
      <Link
        href={exploreHref}
        className="group absolute bottom-4 right-4 z-10 inline-flex items-center gap-1 rounded-full bg-background/90 px-4 py-1.5 font-body text-xs font-medium uppercase tracking-wide text-on-surface backdrop-blur-sm transition-colors duration-300 hover:bg-secondary hover:text-on-secondary"
      >
        Explore
        <ArrowUpRight size={14} aria-hidden="true" />
      </Link>
    </>
  );
}
