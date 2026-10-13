"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

type AboutScrollImageProps = {
  kicker: string;
  headingLead: string;
  headingAccent: string;
  headingTail: string;
  paragraph: string;
  buttonHref: string;
  buttonLabel: string;
  imageSrc: string;
  imageAlt: string;
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

/** Mobile renders the static final state regardless (see the early-return
 *  branch below), so this default only matters for a one-frame flash
 *  before hydration settles. */
function getServerSnapshot() {
  return false;
}

/**
 * Three-phase pinned scroll section:
 *   Phase 1 (0-20%)  — cream background, dark TopText near the top, a small
 *     rounded image bottom-anchored well below it. Nothing overlaps.
 *   Phase 2 (20-70%) — TopText fades out as soon as progress passes 20%
 *     (a timed CSS transition, not scroll-scrubbed — see showTopText below)
 *     while the image grows from its small bottom-anchored size to a
 *     full-bleed background (border-radius easing to 0) and a dark scrim
 *     fades in behind where the text will reappear. Most of this phase is
 *     a deliberate text-free beat.
 *   Phase 3 (70-100%) — CenterText (same heading/paragraph/button, now
 *     white) fades in past 70%, centered over the darkened full-bleed image.
 *
 * Two separate <TextBlock> instances (not one repositioning block) is
 * deliberate: each only renders past opacity 0 inside its own safe window,
 * so there's never a frame with dark text over the image or white text over
 * the cream background. The image is bottom-anchored (not centered) so its
 * small phase-1 size sits low in the viewport, clear of TopText above it.
 *
 * showTopText/showCenterText are driven by useMotionValueEvent -> useState
 * (the same pattern Navbar.tsx uses for its scroll-direction hide/show)
 * rather than binding opacity straight to a useTransform output — directly
 * bound continuous opacity transforms were observed to occasionally lag
 * behind the frame/scrim transforms' progress during fast scrolling,
 * visible as a brief, faint overlap; the discrete threshold + CSS
 * transition approach doesn't have that failure mode.
 */
export function AboutScrollImage({
  kicker,
  headingLead,
  headingAccent,
  headingTail,
  paragraph,
  buttonHref,
  buttonLabel,
  imageSrc,
  imageAlt,
}: AboutScrollImageProps) {
  const reduceMotion = useReducedMotion();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isMobile = useSyncExternalStore(subscribeToMobileQuery, getMobileSnapshot, getServerSnapshot);

  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ["start start", "end end"],
  });

  // Every pair below shares one CSS unit across its whole range — framer
  // motion's useTransform can't interpolate between mismatched units
  // (e.g. "420px" -> "100%"), it silently pairs the start number with the
  // end unit instead, which renders as the end state from scroll 0.
  const frameWidth = useTransform(scrollYProgress, [0, 0.2, 0.7, 1], ["62%", "62%", "100%", "100%"]);
  const frameHeight = useTransform(scrollYProgress, [0, 0.2, 0.7, 1], ["24vh", "24vh", "100%", "100%"]);
  const frameRadius = useTransform(scrollYProgress, [0, 0.2, 0.7, 1], ["28px", "28px", "0px", "0px"]);
  const scrimOpacity = useTransform(scrollYProgress, [0, 0.2, 0.7, 1], [0, 0, 0.6, 0.6]);

  // Threshold-based (not continuously scroll-scrubbed) visibility for the
  // two text layers — same pattern as Navbar's scroll-direction hide/show
  // (useMotionValueEvent -> state -> CSS transition) rather than binding
  // opacity directly to a useTransform output. The image (growing 0.2-0.7)
  // reaches the text block's vertical position around progress ~0.38, so
  // TopText must be fully gone before that — showTopText flips off at 0.2.
  const [showTopText, setShowTopText] = useState(true);
  const [showCenterText, setShowCenterText] = useState(false);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setShowTopText(latest < 0.2);
    setShowCenterText(latest > 0.7);
  });

  if (reduceMotion || isMobile) {
    return (
      <div className="relative flex min-h-[70vh] w-full flex-col items-center justify-center overflow-hidden px-margin py-20 text-center">
        <Image src={imageSrc} alt={imageAlt} fill sizes="100vw" className="object-cover" />
        <div aria-hidden="true" className="absolute inset-0" style={{ backgroundColor: "rgba(20,16,12,0.6)" }} />
        <div className="relative z-10 max-w-2xl">
          <TextBlock
            kicker={kicker}
            headingLead={headingLead}
            headingAccent={headingAccent}
            headingTail={headingTail}
            paragraph={paragraph}
            buttonHref={buttonHref}
            buttonLabel={buttonLabel}
            kickerColor="#e4c565"
            headingColor="#f9f8f6"
            paragraphColor="#e5ded2"
            buttonColor="#f9f8f6"
          />
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative h-[220vh] md:h-[260vh]">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <motion.div
          style={{
            width: frameWidth,
            height: frameHeight,
            borderRadius: frameRadius,
            willChange: "width, height, border-radius",
          }}
          className="absolute left-1/2 bottom-0 -translate-x-1/2 overflow-hidden"
        >
          <Image src={imageSrc} alt={imageAlt} fill sizes="100vw" className="object-cover" />
          <motion.div
            aria-hidden="true"
            style={{ opacity: scrimOpacity, backgroundColor: "rgba(20,16,12,1)" }}
            className="absolute inset-0"
          />
        </motion.div>

        <div
          className={cn(
            "absolute inset-x-0 top-[12vh] z-10 flex justify-center px-margin text-center transition-all duration-500 ease-luxury md:top-[15vh]",
            showTopText ? "opacity-100" : "pointer-events-none -translate-y-4 opacity-0",
          )}
        >
          <div className="max-w-2xl">
            <TextBlock
              kicker={kicker}
              headingLead={headingLead}
              headingAccent={headingAccent}
              headingTail={headingTail}
              paragraph={paragraph}
              buttonHref={buttonHref}
              buttonLabel={buttonLabel}
              kickerColor="#8c6e1c"
              headingColor="#1a1a1a"
              paragraphColor="#6c6863"
              buttonColor="#1a1a1a"
            />
          </div>
        </div>

        <div
          className={cn(
            "absolute inset-0 z-10 flex items-center justify-center px-margin text-center transition-opacity duration-500 ease-luxury",
            showCenterText ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <div className="max-w-2xl">
            <TextBlock
              kicker={kicker}
              headingLead={headingLead}
              headingAccent={headingAccent}
              headingTail={headingTail}
              paragraph={paragraph}
              buttonHref={buttonHref}
              buttonLabel={buttonLabel}
              kickerColor="#e4c565"
              headingColor="#f9f8f6"
              paragraphColor="#e5ded2"
              buttonColor="#f9f8f6"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

type TextBlockProps = {
  kicker: string;
  headingLead: string;
  headingAccent: string;
  headingTail: string;
  paragraph: string;
  buttonHref: string;
  buttonLabel: string;
  kickerColor: string;
  headingColor: string;
  paragraphColor: string;
  buttonColor: string;
};

function TextBlock({
  kicker,
  headingLead,
  headingAccent,
  headingTail,
  paragraph,
  buttonHref,
  buttonLabel,
  kickerColor,
  headingColor,
  paragraphColor,
  buttonColor,
}: TextBlockProps) {
  return (
    <>
      <div className="mb-3 flex items-center justify-center gap-3">
        <span className="h-px w-8 md:w-12 bg-secondary" aria-hidden="true" />
        <motion.p style={{ color: kickerColor }} className="font-body text-label uppercase">
          {kicker}
        </motion.p>
      </div>
      <motion.h2
        style={{ color: headingColor }}
        className="font-display text-headline-mobile md:text-headline-tablet lg:text-headline mb-4"
      >
        {headingLead} <em className="italic text-secondary">{headingAccent}</em> {headingTail}
      </motion.h2>
      <motion.p style={{ color: paragraphColor }} className="font-body text-body-lg leading-relaxed mb-8">
        {paragraph}
      </motion.p>
      <motion.span style={{ color: buttonColor }} className="inline-block">
        <Button
          href={buttonHref}
          variant="secondary"
          size="lg"
          style={{ borderColor: "currentcolor", color: "currentcolor" }}
        >
          {buttonLabel}
        </Button>
      </motion.span>
    </>
  );
}
