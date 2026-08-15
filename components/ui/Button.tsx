import Link from "next/link";
import { cn } from "@/lib/utils/cn";

type Variant =
  | "primary" // filled dark, for light backgrounds (e.g. EXPLORE THE CATALOGUE, ENQUIRE NOW)
  | "secondary" // outline, for light backgrounds (e.g. GET IN TOUCH, Our Story)
  | "ghost" // no border, for nav / low-emphasis actions
  | "hero-primary" // filled light, for the dark hero section
  | "hero-secondary"; // outline light, for the dark hero section

type Size = "default" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-on-surface text-white border border-on-surface hover:bg-transparent hover:text-on-surface",
  secondary:
    "bg-transparent text-on-surface border border-outline-variant hover:border-secondary hover:text-secondary",
  ghost:
    "bg-transparent text-on-surface-variant border border-transparent hover:text-on-surface",
  "hero-primary":
    "bg-hero-foreground text-hero-bg border border-hero-foreground hover:bg-transparent hover:text-hero-foreground",
  "hero-secondary":
    "bg-transparent text-hero-foreground border border-hero-border hover:border-secondary hover:text-secondary",
};

const sizeClasses: Record<Size, string> = {
  default: "px-8 py-4 text-label",
  lg: "px-10 py-5 text-label",
};

const baseClasses =
  "inline-flex items-center justify-center gap-2 font-body uppercase tracking-widest transition-colors duration-300 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

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
 * otherwise a native <button>. Variants map 1:1 to the button treatments
 * approved across the Stitch homepage / catalogue / product prototypes.
 */
export function Button({
  variant = "primary",
  size = "default",
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(baseClasses, variantClasses[variant], sizeClasses[size], className);

  if ("href" in props && props.href) {
    const { href, ...anchorProps } = props;
    return (
      <Link href={href} className={classes} {...anchorProps}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
