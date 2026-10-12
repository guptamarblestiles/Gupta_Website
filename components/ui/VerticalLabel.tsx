import { cn } from "@/lib/utils/cn";

type VerticalLabelProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Decorative side label set in vertical writing mode (e.g. "Editorial /
 * Vol. 01", "Marble — Collection No. 04") — meant to sit absolutely
 * positioned along the edge of a hero or feature image by the caller.
 * Desktop-only and aria-hidden: it's typographic ornament, not content,
 * so screen readers should skip it rather than read sideways text.
 */
export function VerticalLabel({ children, className }: VerticalLabelProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "hidden [writing-mode:vertical-rl] font-body text-label uppercase text-on-surface-variant lg:block",
        className,
      )}
    >
      {children}
    </span>
  );
}
