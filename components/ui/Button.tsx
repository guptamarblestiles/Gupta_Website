import Link from "next/link";
import { cn } from "@/lib/utils/cn";

type Variant =
  | "primary" // filled charcoal, for light backgrounds
  | "secondary" // outline, fills charcoal on hover — light backgrounds
  | "ghost" // no border, for nav / low-emphasis actions
  | "hero-primary" // filled ivory, for the solid charcoal hero panel
  | "hero-secondary"; // outline ivory, for the solid charcoal hero panel

type Size = "default" | "lg";

const sizeClasses: Record<Size, string> = {
  default: "h-12 px-7 text-label",
  lg: "h-14 px-9 text-label",
};

const variantClasses: Record<Variant, string> = {
  primary: "bg-on-surface text-white hover:bg-on-surface-variant",
  secondary: "border border-on-surface text-on-surface hover:bg-on-surface hover:text-white",
  ghost: "text-on-surface-variant hover:text-on-surface",
  "hero-primary": "bg-hero-foreground text-hero-bg hover:bg-white",
  "hero-secondary":
    "border border-hero-border text-hero-foreground hover:border-hero-foreground",
};

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-sm font-body whitespace-nowrap transition-colors duration-200 ease-luxury focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

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
 * otherwise a native <button>. Plain color-transition fills only — no
 * sliding overlays, no gradients, no glow.
 */
export function Button({
  variant = "primary",
  size = "default",
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(baseClasses, sizeClasses[size], variantClasses[variant], className);

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
