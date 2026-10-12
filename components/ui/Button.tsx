import Link from "next/link";
import { cn } from "@/lib/utils/cn";

type Variant =
  | "primary" // filled charcoal, gold slides in on hover — light backgrounds
  | "secondary" // outline, fills charcoal on hover — light backgrounds
  | "ghost" // no border, for nav / low-emphasis actions
  | "hero-primary" // filled alabaster, for the dark hero section
  | "hero-secondary"; // outline alabaster, for the dark hero section

type Size = "default" | "lg";

const sizeClasses: Record<Size, string> = {
  default: "h-12 px-8 text-label",
  lg: "h-14 px-10 text-label",
};

const baseClasses =
  "relative inline-flex items-center justify-center gap-2 overflow-hidden font-body uppercase whitespace-nowrap transition-colors duration-500 ease-luxury focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-secondary disabled:opacity-50 disabled:cursor-not-allowed";

/** The sliding gold fill behind a primary button's content — off-screen
 *  left at rest, covers the button on hover/focus. Luxury's signature
 *  "Gold Sliding Animation" bold-factor; requires the layered span
 *  structure below so label text can sit above it via z-index. */
function GoldSlide() {
  return (
    <span
      aria-hidden
      className="absolute inset-0 -translate-x-full bg-secondary transition-transform duration-500 ease-luxury group-hover:translate-x-0 group-focus-visible:translate-x-0"
    />
  );
}

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
};

type ButtonAsButton = CommonProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type ButtonAsLink = CommonProps &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

type ButtonProps = ButtonAsButton | ButtonAsLink;

/**
 * Shared CTA button. Renders a Next.js <Link> when `href` is provided,
 * otherwise a native <button>. `primary`/`hero-primary` carry the gold
 * slide-in fill + deepening shadow; `secondary`/`hero-secondary` are
 * outline-only, filling solid on hover; `ghost` stays text-only.
 */
export function Button({
  variant = "primary",
  size = "default",
  className,
  children,
  ...props
}: ButtonProps) {
  const sizeClass = cn(baseClasses, sizeClasses[size]);
  const isPrimary = variant === "primary" || variant === "hero-primary";

  let variantClasses: string;
  switch (variant) {
    case "primary":
      variantClasses =
        "group bg-on-surface text-white shadow-button hover:shadow-button-hover";
      break;
    case "secondary":
      variantClasses =
        "border border-on-surface text-on-surface hover:bg-on-surface hover:text-white";
      break;
    case "ghost":
      variantClasses = "text-on-surface-variant hover:text-secondary";
      break;
    case "hero-primary":
      variantClasses =
        "group bg-hero-foreground text-hero-bg shadow-button hover:shadow-button-hover";
      break;
    case "hero-secondary":
      variantClasses =
        "border border-hero-border text-hero-foreground hover:border-secondary hover:text-secondary";
      break;
  }

  const classes = cn(sizeClass, variantClasses, className);
  const content = isPrimary ? (
    <>
      <GoldSlide />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </>
  ) : (
    children
  );

  if ("href" in props && props.href) {
    const { href, ...anchorProps } = props;
    return (
      <Link href={href} className={classes} {...anchorProps}>
        {content}
      </Link>
    );
  }

  return (
    <button className={classes} {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
      {content}
    </button>
  );
}
