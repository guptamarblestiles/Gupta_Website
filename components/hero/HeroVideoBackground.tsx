"use client";

import { useReducedMotion } from "framer-motion";
import { useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";

/**
 * Full-bleed background playlist for the hero: plays all 10 clips back to
 * back in order, then loops from the top (not each clip looping alone).
 * A single <video> element swaps its src on `onEnded` rather than mounting
 * 10 elements, so only one clip is ever buffered at a time.
 *
 * Source clips live in /public/videos/hero, pre-compressed with ffmpeg
 * (see scratchpad/compress_hero_videos.sh) from ~237MB of 4K source down to
 * ~26MB total, h264/mp4, audio stripped, max edge 1920px. Keep future
 * additions under ~5MB/clip so the first-paint clip doesn't delay LCP.
 *
 * Reduced-motion users get the static poster frame only, no video/JS timer.
 */
// "09-house-interior" (a generic real-estate walkthrough clip) and
// "10-cleaning" (a Roomba vacuum commercial) were in the original asset
// drop but have nothing to do with marble/tile/stone — excluded.
const PLAYLIST = [
  "01-marble-veining",
  "02-marble-polished",
  "03-tile-texture",
  "04-granite-speckle",
  "05-onyx-glossy",
  "06-marble-close-up",
  "07-tile-pattern",
  "08-stone-surface",
].map((name) => `/videos/hero/${name}.mp4`);

const POSTER = "/videos/hero-poster.jpg";

/** Below this width, skip the video playlist entirely — mobile visitors
 *  get the static poster instead, saving cellular data and main-thread
 *  decode work (and keeping the poster image, not a video frame, as the
 *  mobile LCP candidate). Matches Tailwind's `md` breakpoint. */
const MOBILE_BREAKPOINT_QUERY = "(max-width: 767px)";

function subscribeToMobileQuery(callback: () => void) {
  const mql = window.matchMedia(MOBILE_BREAKPOINT_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

/** Server snapshot is "mobile" so SSR/first paint always renders the
 *  static poster — never a flash of video before hydration settles. */
function getMobileSnapshot() {
  return window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches;
}

export function HeroVideoBackground() {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const isMobile = useSyncExternalStore(subscribeToMobileQuery, getMobileSnapshot, () => true);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (reduceMotion || isMobile) {
    return (
      <Image
        src={POSTER}
        alt=""
        aria-hidden="true"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
    );
  }

  return (
    <video
      ref={videoRef}
      key={PLAYLIST[index]}
      src={PLAYLIST[index]}
      poster={index === 0 ? POSTER : undefined}
      autoPlay
      muted
      playsInline
      preload="auto"
      onEnded={() => setIndex((i) => (i + 1) % PLAYLIST.length)}
      className="absolute inset-0 h-full w-full object-cover"
      aria-hidden="true"
    />
  );
}
