import { WHAT_WE_DEAL_IN } from "@/lib/what-we-deal-in";

/**
 * Thin, continuous marquee strip advertising what the business deals in.
 * Pure CSS (animate-marquee, defined in app/globals.css) — no client JS
 * needed. `motion-reduce:`/`motion-safe:` (built into Tailwind) swap the
 * animated track for a static wrapped row under prefers-reduced-motion,
 * rather than relying on the global reduced-motion reset, which would just
 * freeze the animation mid-loop with a word cut off.
 */
export function WhatWeDealIn() {
  const srList = WHAT_WE_DEAL_IN.join(", ");

  return (
    <section className="h-16 overflow-hidden border-b border-t border-outline-variant bg-background">
      <span className="sr-only">{`We deal in ${srList}.`}</span>

      <div className="motion-reduce:hidden flex h-full w-max items-center hover:[animation-play-state:paused] animate-marquee">
        <MarqueeTrack />
        <MarqueeTrack />
      </div>

      <div className="hidden h-full flex-wrap items-center justify-center gap-x-6 gap-y-1 px-margin motion-reduce:flex">
        {WHAT_WE_DEAL_IN.map((item) => (
          <span
            key={item}
            className="font-body text-micro uppercase text-on-surface-variant whitespace-nowrap"
          >
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}

function MarqueeTrack() {
  return (
    <div aria-hidden="true" className="flex items-center">
      {WHAT_WE_DEAL_IN.map((item) => (
        <div key={item} className="flex items-center">
          <span className="font-body text-micro uppercase text-on-surface-variant whitespace-nowrap px-6">
            {item}
          </span>
          <span className="h-3 w-px bg-secondary" aria-hidden="true" />
        </div>
      ))}
    </div>
  );
}
