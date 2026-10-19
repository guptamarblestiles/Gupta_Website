import { cn } from "@/lib/cn";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-8", className)} aria-hidden>
      <rect width="64" height="64" rx="14" fill="#1c1917" />
      <path d="M18 18h12v12H18zM34 18h12v12H34zM18 34h12v12H18z" fill="#f6ece2" />
      <path d="M34 34h12v12H34z" fill="#b87333" />
    </svg>
  );
}

export function Brand({ subtitle = "Admin" }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark />
      <div className="leading-tight">
        <div className="font-display text-[17px] text-ink">Gupta Interior</div>
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-copper-strong">{subtitle}</div>
      </div>
    </div>
  );
}
