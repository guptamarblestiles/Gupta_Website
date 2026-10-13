"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

export type SpaceClip = {
  /** e.g. "/videos/spaces/interior-01.mp4" */
  src: string;
  /** e.g. "/videos/spaces/interior-01.jpg" */
  poster: string;
  /** CSS object-position, per-clip — some crops look better off-center. */
  objectPosition?: string;
};

type SpaceCardProps = {
  title: string;
  caption: string;
  href: string;
  clips: SpaceClip[];
};

const CROSSFADE_MS = 700;

/**
 * One "Spaces" card: plays its clip(s) only on hover/focus (desktop) or
 * while mostly in view (touch, via IntersectionObserver). Interior has two
 * clips that play back to back with a crossfade; Exterior/Washroom have
 * one clip each and just loop natively — same component either way.
 *
 * Two stacked <video> elements swap opacity for the crossfade so there's
 * never a flash/black-frame between clips; a plain <img> poster sits
 * underneath both and is all that ever renders for prefers-reduced-motion
 * users or before the user has interacted with the card.
 *
 * Deliberately keeps video0Ref/video1Ref as two separate named refs (no
 * `[ref0, ref1]` array) — the array is a fresh value every render, which
 * the React Compiler's ref-mutation analysis can't trace back to a stable
 * ref, so it flags the imperative `.currentTime =` / `.play()` calls as
 * illegal post-render mutation. Direct named refs read clean.
 */
export function SpaceCard({ title, caption, href, clips }: SpaceCardProps) {
  const reduceMotion = useReducedMotion();
  const [playing, setPlaying] = useState(false);
  const [activeLayer, setActiveLayer] = useState<0 | 1>(0);
  const [layerClipIndex, setLayerClipIndex] = useState<[number, number]>([
    0,
    clips.length > 1 ? 1 : 0,
  ]);

  const cardRef = useRef<HTMLAnchorElement>(null);
  const video0Ref = useRef<HTMLVideoElement>(null);
  const video1Ref = useRef<HTMLVideoElement>(null);
  const hasMultipleClips = clips.length > 1;

  const refForLayer = useCallback(
    (layer: 0 | 1) => (layer === 0 ? video0Ref.current : video1Ref.current),
    [],
  );

  const start = useCallback(() => {
    setPlaying(true);
    const active = refForLayer(activeLayer);
    if (active) {
      active.currentTime = 0;
      active.play().catch(() => {});
    }
    if (hasMultipleClips) {
      const inactive = refForLayer(activeLayer === 0 ? 1 : 0);
      if (inactive) inactive.preload = "auto";
    }
  }, [activeLayer, hasMultipleClips, refForLayer]);

  const stop = useCallback(() => {
    setPlaying(false);
    for (const el of [video0Ref.current, video1Ref.current]) {
      if (!el) continue;
      el.pause();
      el.currentTime = 0;
    }
  }, []);

  const handleClipEnded = useCallback(
    (layer: 0 | 1) => {
      if (!hasMultipleClips || layer !== activeLayer) return;
      const nextLayer: 0 | 1 = layer === 0 ? 1 : 0;
      const nextVideo = refForLayer(nextLayer);
      if (nextVideo) {
        nextVideo.currentTime = 0;
        nextVideo.play().catch(() => {});
      }
      setActiveLayer(nextLayer);
      setLayerClipIndex((prev) => {
        // The layer that just finished (now inactive) gets queued up with
        // the clip after the one now playing, ready for its next turn.
        // The layer becoming active (nextLayer) must keep its own index
        // untouched — it's mid-playback.
        const advanced = (prev[nextLayer] + 1) % clips.length;
        return layer === 0 ? [advanced, prev[1]] : [prev[0], advanced];
      });
    },
    [activeLayer, hasMultipleClips, clips.length, refForLayer],
  );

  // Touch/no-hover devices: play while the card is mostly in view instead
  // of relying on hover, since there's no hover state to trigger from.
  useEffect(() => {
    if (reduceMotion) return;
    const supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (supportsHover) return;

    const node = cardRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) start();
        else stop();
      },
      { threshold: 0.6 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [reduceMotion, start, stop]);

  return (
    <Link
      ref={cardRef}
      href={href}
      aria-label={`Explore ${title}`}
      onMouseEnter={start}
      onMouseLeave={stop}
      onFocus={start}
      onBlur={stop}
      className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-3xl bg-surface-variant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
    >
      {/* Poster — the permanent fallback for reduced motion, and what
          shows whenever the card isn't actively playing. */}
      <Image
        src={clips[0].poster}
        alt=""
        aria-hidden="true"
        fill
        sizes="(min-width: 1024px) 33vw, 100vw"
        className={cn(
          "object-cover transition-opacity duration-700",
          playing && !reduceMotion ? "opacity-0" : "opacity-100",
        )}
        style={{ objectPosition: clips[0].objectPosition }}
      />

      {!reduceMotion && (
        <video
          ref={video0Ref}
          src={(hasMultipleClips ? clips[layerClipIndex[0]] : clips[0]).src}
          poster={(hasMultipleClips ? clips[layerClipIndex[0]] : clips[0]).poster}
          muted
          playsInline
          preload="metadata"
          loop={!hasMultipleClips}
          onEnded={() => handleClipEnded(0)}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity ease-out",
            activeLayer === 0 && playing ? "opacity-100" : "opacity-0",
          )}
          style={{
            transitionDuration: `${CROSSFADE_MS}ms`,
            objectPosition: (hasMultipleClips ? clips[layerClipIndex[0]] : clips[0]).objectPosition,
          }}
          aria-hidden="true"
        />
      )}

      {!reduceMotion && hasMultipleClips && (
        <video
          ref={video1Ref}
          src={clips[layerClipIndex[1]].src}
          poster={clips[layerClipIndex[1]].poster}
          muted
          playsInline
          preload="metadata"
          onEnded={() => handleClipEnded(1)}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity ease-out",
            activeLayer === 1 && playing ? "opacity-100" : "opacity-0",
          )}
          style={{
            transitionDuration: `${CROSSFADE_MS}ms`,
            objectPosition: clips[layerClipIndex[1]].objectPosition,
          }}
          aria-hidden="true"
        />
      )}

      {/* Scrim so the label/link stay readable over any frame of footage. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
      />

      <div className="relative z-10 flex flex-col gap-2 p-6 md:p-7">
        <div className="flex items-center justify-between gap-3">
          <span className="font-display text-xl text-white md:text-2xl">{title}</span>
          <span className="inline-flex items-center gap-1 font-body text-sm font-medium uppercase tracking-wide text-white/90 transition-colors group-hover:text-secondary-fixed">
            Explore
            <ArrowUpRight size={16} aria-hidden="true" />
          </span>
        </div>
        <p className="font-body text-sm text-white/80 max-w-[85%] leading-relaxed">{caption}</p>
      </div>
    </Link>
  );
}
