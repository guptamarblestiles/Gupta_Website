"use client";

import { useRef, useSyncExternalStore } from "react";
import Image from "next/image";
import { motion, type MotionValue, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/Button";

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

/** Server snapshot is "desktop" (false) — mobile gets the static final-state
 *  render regardless (see the early-return branch below), so this only
 *  matters for a one-frame flash before hydration settles. */
function getServerSnapshot() {
  return false;
}

function lerpChannel(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

function lerpHex(hexA: string, hexB: string, t: number) {
  const a = [1, 3, 5].map((i) => parseInt(hexA.slice(i, i + 2), 16));
  const b = [1, 3, 5].map((i) => parseInt(hexB.slice(i, i + 2), 16));
  const mixed = a.map((channel, i) => lerpChannel(channel, b[i], t));
  return `#${mixed.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

// Text recolors in lockstep with the dark scrim, both driven by the same
// scrollYProgress and the same [0, 0.5, 1] keyframe positions — front-loaded
// (85% of the way to the end color by the halfway point of the scroll) so
// that at mid-scroll the text is already nearly white against an already
// substantially dark scrim, rather than both being stuck at a washed-out
// 50/50 blend. MID_T is that front-load factor.
const MID_T = 0.85;
function colorStops(startHex: string, endHex: string): [string, string, string] {
  return [startHex, lerpHex(startHex, endHex, MID_T), endHex];
}

const KICKER_STOPS = colorStops("#8c6e1c", "#e4c565");
const HEADING_STOPS = colorStops("#1a1a1a", "#f9f8f6");
const PARAGRAPH_STOPS = colorStops("#6c6863", "#e5ded2");
const BUTTON_STOPS = colorStops("#1a1a1a", "#f9f8f6");
const PROGRESS_STOPS = [0, 0.5, 1];

/**
 * Pins the section (tall wrapper + sticky inner panel) while the image
 * grows from a small centred rounded shape to a full-bleed background
 * covering the entire pinned viewport — border-radius easing to 0, width
 * and height both reaching 100%. There is no card/panel of any kind behind
 * the text: it sits directly on the plain page background at the start,
 * then directly on the image once a dark scrim (rgba(20,16,12), fading
 * 0 -> ~0.55) has grown in behind it. The image itself stays at full
 * opacity throughout — only the scrim dims it. Text recolors dark -> white
 * off the same scrollYProgress and the same keyframe positions as the
 * scrim, so the two are always in step (see colorStops/PROGRESS_STOPS).
 *
 * Mobile and prefers-reduced-motion both render the static final state
 * (full-bleed image, full scrim, white text) with no pinning/animation.
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
  const frameWidth = useTransform(scrollYProgress, [0, 1], ["22%", "100%"]);
  const frameHeight = useTransform(scrollYProgress, [0, 1], ["26vh", "100%"]);
  const frameRadius = useTransform(scrollYProgress, [0, 1], ["500px", "0px"]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.06]);
  const scrimOpacity = useTransform(scrollYProgress, PROGRESS_STOPS, [0, 0.4, 0.55]);

  const kickerColor = useTransform(scrollYProgress, PROGRESS_STOPS, KICKER_STOPS);
  const headingColor = useTransform(scrollYProgress, PROGRESS_STOPS, HEADING_STOPS);
  const paragraphColor = useTransform(scrollYProgress, PROGRESS_STOPS, PARAGRAPH_STOPS);
  const buttonColor = useTransform(scrollYProgress, PROGRESS_STOPS, BUTTON_STOPS);

  if (reduceMotion || isMobile) {
    return (
      <div className="relative flex min-h-[70vh] w-full flex-col items-center justify-center overflow-hidden px-margin py-20 text-center">
        <Image src={imageSrc} alt={imageAlt} fill sizes="100vw" className="object-cover" />
        <div aria-hidden="true" className="absolute inset-0" style={{ backgroundColor: "rgba(20,16,12,0.55)" }} />
        <div className="relative z-10 max-w-2xl">
          <TextBlock
            kicker={kicker}
            headingLead={headingLead}
            headingAccent={headingAccent}
            headingTail={headingTail}
            paragraph={paragraph}
            kickerColor="#e4c565"
            headingColor="#f9f8f6"
            paragraphColor="#e5ded2"
          />
          <Button href={buttonHref} variant="secondary" size="lg" style={{ borderColor: "#f9f8f6", color: "#f9f8f6" }}>
            {buttonLabel}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative h-[180vh] md:h-[220vh]">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <motion.div
          style={{
            width: frameWidth,
            height: frameHeight,
            borderRadius: frameRadius,
            willChange: "width, height, border-radius",
          }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden"
        >
          <motion.div style={{ scale: imageScale }} className="absolute inset-0">
            <Image src={imageSrc} alt={imageAlt} fill sizes="100vw" className="object-cover" />
          </motion.div>
          <motion.div
            aria-hidden="true"
            style={{ opacity: scrimOpacity, backgroundColor: "rgba(20,16,12,1)" }}
            className="absolute inset-0"
          />
        </motion.div>

        <div className="relative z-10 flex h-full flex-col items-center justify-center px-margin text-center">
          <div className="max-w-2xl">
            <TextBlock
              kicker={kicker}
              headingLead={headingLead}
              headingAccent={headingAccent}
              headingTail={headingTail}
              paragraph={paragraph}
              kickerColor={kickerColor}
              headingColor={headingColor}
              paragraphColor={paragraphColor}
            />
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
  kickerColor: string | MotionValue<string>;
  headingColor: string | MotionValue<string>;
  paragraphColor: string | MotionValue<string>;
};

function TextBlock({
  kicker,
  headingLead,
  headingAccent,
  headingTail,
  paragraph,
  kickerColor,
  headingColor,
  paragraphColor,
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
    </>
  );
}
