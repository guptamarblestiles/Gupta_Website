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

/** Server snapshot is "desktop" (false) — the larger desktop start width is
 *  the safer default if a mobile client briefly renders it before
 *  hydration settles, since it just means a moment of fixed-px sizing
 *  rather than fighting mobile's percentage-based layout. */
function getServerSnapshot() {
  return false;
}

// Text colors interpolate from the section's normal light-cream palette
// to a warm off-white once the image has taken over the whole background,
// so the heading/paragraph/button stay readable (>= 4.5:1) against the
// dark overlay in both states. Literal colors (not CSS vars) because
// framer-motion's useTransform can only interpolate concrete color values.
const KICKER_COLORS = ["#8c6e1c", "#e4c565"];
const HEADING_COLORS = ["#1a1a1a", "#f9f8f6"];
const PARAGRAPH_COLORS = ["#6c6863", "#e5ded2"];
const BUTTON_COLORS = ["#1a1a1a", "#f9f8f6"];

/**
 * Pins the section (tall wrapper + sticky inner panel) while the image
 * grows from a small centred rounded shape to a full-bleed background
 * covering the entire pinned viewport — border-radius easing to 0, width
 * and height both reaching 100%. The heading/kicker/paragraph/button sit
 * on top the whole time (never fade out) and smoothly recolor from dark
 * (readable over the start state's light cream background) to a warm
 * off-white (readable over the image's dark overlay once expanded).
 *
 * Only `transform`/`opacity`/dimensions tied to `scale`+`border-radius`
 * are animated — `will-change` is scoped to just the image frame, the one
 * element whose box actually resizes every frame.
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
  const frameWidth = useTransform(scrollYProgress, [0, 1], [isMobile ? "45%" : "22%", "100%"]);
  const frameHeight = useTransform(scrollYProgress, [0, 1], [isMobile ? "22vh" : "26vh", "100%"]);
  const frameRadius = useTransform(scrollYProgress, [0, 1], ["500px", "0px"]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.06]);
  // Both ramp up fast (most of the way there by the midpoint) so the dark
  // overlay is already strong well before the text finishes turning white
  // — otherwise light text briefly sits on a still-bright image.
  const imageOpacity = useTransform(scrollYProgress, [0, 0.4, 1], [1, 0.4, 0.25]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.4, 1], [0, 0.75, 0.9]);

  const kickerColor = useTransform(scrollYProgress, [0.5, 0.85], KICKER_COLORS);
  const headingColor = useTransform(scrollYProgress, [0.5, 0.85], HEADING_COLORS);
  const paragraphColor = useTransform(scrollYProgress, [0.5, 0.85], PARAGRAPH_COLORS);
  const buttonColor = useTransform(scrollYProgress, [0.5, 0.85], BUTTON_COLORS);

  // A soft cream backdrop sits behind the text while the image is still
  // small (so the early overlap between the two centred, stacked layers
  // never drops below AA contrast), then fades out just as the dark
  // gradient overlay above has grown strong enough to carry contrast on
  // its own — and well before the text itself starts turning light (0.5+).
  const textPanelOpacity = useTransform(scrollYProgress, [0.15, 0.4], [0.94, 0]);

  if (reduceMotion) {
    return (
      <div className="relative flex min-h-[80vh] w-full flex-col items-center justify-center overflow-hidden px-margin py-24 text-center">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          sizes="100vw"
          className="object-cover"
          style={{ opacity: 0.4 }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(20,16,12,0.6), rgba(20,16,12,0.7))" }}
        />
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
          <motion.div style={{ scale: imageScale, opacity: imageOpacity }} className="absolute inset-0">
            <Image src={imageSrc} alt={imageAlt} fill sizes="100vw" className="object-cover" />
          </motion.div>
          <motion.div
            aria-hidden="true"
            style={{
              opacity: overlayOpacity,
              background: "linear-gradient(to bottom, rgba(20,16,12,0.55), rgba(20,16,12,0.75))",
            }}
            className="absolute inset-0"
          />
        </motion.div>

        <div className="relative z-10 flex h-full flex-col items-center justify-center px-margin text-center">
          <div className="relative max-w-2xl">
            <motion.div
              aria-hidden="true"
              style={{ opacity: textPanelOpacity }}
              className="absolute -inset-x-6 -inset-y-8 -z-10 rounded-[2rem] bg-background md:-inset-x-10 md:-inset-y-10"
            />
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
