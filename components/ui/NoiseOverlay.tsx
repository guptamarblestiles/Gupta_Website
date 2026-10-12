/**
 * Fixed, full-viewport paper-grain texture — the luxury system's "expensive
 * paper" tactile cue. Mounted once in app/layout.tsx, never per-page.
 * Opacity is deliberately almost subliminal: it should never be something
 * a visitor consciously notices, only something that'd feel wrong if it
 * were suddenly flat and missing.
 */
export function NoiseOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 bg-noise opacity-[0.02]"
    />
  );
}
