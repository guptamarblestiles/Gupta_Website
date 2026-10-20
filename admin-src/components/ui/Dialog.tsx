"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@admin/components/ui/Button";
import { Input } from "@admin/components/ui/Field";
import { cn } from "@admin/lib/cn";

/** Accessible modal on the native <dialog> element (focus trap, Esc, backdrop). */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100%-1.5rem)] rounded-2xl border border-line bg-admin-surface p-0 text-ink shadow-pop backdrop:backdrop-blur-[1px] open:animate-fade-in",
        size === "sm" && "max-w-md",
        size === "md" && "max-w-lg",
        size === "lg" && "max-w-2xl",
        size === "xl" && "max-w-4xl",
      )}
    >
      {open && (
        <div className="flex max-h-[85dvh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <h2 id={titleId} className="text-lg font-semibold">
                {title}
              </h2>
              {description && <div className="mt-1 text-sm text-ink-muted">{description}</div>}
            </div>
            <button type="button" onClick={onClose} className="rounded-md p-1.5 text-ink-faint hover:bg-sunken hover:text-ink" aria-label="Close">
              <X className="size-5" />
            </button>
          </div>
          {children && <div className="overflow-y-auto px-5 py-4">{children}</div>}
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-admin-surface-muted px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

/**
 * Confirmation for risky actions. With `typeToConfirm`, the action stays
 * disabled until the exact text (e.g. the product code) is typed.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel,
  tone = "danger",
  typeToConfirm,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  tone?: "danger" | "primary";
  typeToConfirm?: string;
  busy?: boolean;
}) {
  const [typed, setTyped] = useState("");
  const id = useId();
  const ready = !typeToConfirm || typed.trim() === typeToConfirm;
  return (
    <Dialog
      open={open}
      onClose={() => {
        setTyped("");
        onClose();
      }}
      title={title}
      size="sm"
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={tone} onClick={onConfirm} disabled={!ready} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm text-ink-muted">
        {children}
        {typeToConfirm && (
          <div className="space-y-1.5">
            <label htmlFor={id} className="block text-ink">
              Type <span className="rounded bg-sunken px-1.5 py-0.5 font-mono text-[13px] text-ink">{typeToConfirm}</span> to confirm
            </label>
            <Input id={id} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoFocus />
          </div>
        )}
      </div>
    </Dialog>
  );
}
