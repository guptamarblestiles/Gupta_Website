import { createElement } from "react";
import { cn } from "@/lib/utils/cn";

type ContainerProps<T extends React.ElementType> = {
  as?: T;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

/**
 * Site-wide max-width + horizontal margin wrapper.
 * Matches the "container-max" (1440px) / "margin-desktop" (64px) /
 * "margin-mobile" (20px) rhythm agreed during the Stitch prototyping phase.
 *
 * Uses createElement (rather than JSX) for the dynamic tag: TSX's generic
 * tag-name resolution collapses `children` to `never` when `T` can widen to
 * a void element like <img>, even though every real call site here passes
 * a normal container element (div/section/header/...).
 */
export function Container<T extends React.ElementType = "div">({
  as,
  className,
  children,
  ...props
}: ContainerProps<T>) {
  const Tag = as ?? "div";
  return createElement(
    Tag,
    { className: cn("container-max px-margin w-full", className), ...props },
    children,
  );
}
