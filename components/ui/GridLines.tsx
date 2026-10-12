/**
 * Four fixed vertical gridlines spanning the viewport height, aligned to
 * the edges and middle-thirds of the site's 1600px content container —
 * the luxury system's "visible editorial grid" bold-factor. Desktop only:
 * on a cramped viewport the lines read as clutter, not architecture.
 * Mounted once in app/layout.tsx.
 */
export function GridLines() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-y-0 inset-x-0 z-0 hidden lg:block"
    >
      <div className="relative mx-auto h-full max-w-[1600px]">
        {[0, 1 / 3, 2 / 3, 1].map((fraction) => (
          <div
            key={fraction}
            className="absolute inset-y-0 w-px bg-on-surface/20"
            style={{ left: `${fraction * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
}
