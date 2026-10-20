"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Mail, MessageCircle, Phone } from "lucide-react";
import { Button, buttonClass } from "@admin/components/ui/Button";
import { Badge } from "@admin/components/ui/Display";
import { Select, Textarea } from "@admin/components/ui/Field";
import { useAction } from "@admin/lib/client/useAction";
import { updateEnquiry } from "@admin/actions/enquiries";
import { phoneLinks } from "@admin/lib/catalogue/normalize";
import { cn } from "@admin/lib/cn";

export type EnquiryRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  product_id: string | null;
  product_name: string | null;
  message: string;
  created_at: string;
  status: "new" | "contacted" | "in_progress" | "closed";
  staff_notes: string | null;
};

const STATUS: Record<EnquiryRow["status"], { label: string; tone: "copper" | "info" | "warning" | "success" }> = {
  new: { label: "New", tone: "copper" },
  contacted: { label: "Contacted", tone: "info" },
  in_progress: { label: "In progress", tone: "warning" },
  closed: { label: "Closed", tone: "success" },
};

const when = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export function EnquiryList({ rows, productNames, openId }: { rows: EnquiryRow[]; productNames: Record<string, string>; openId?: string }) {
  const [open, setOpen] = useState<string | null>(openId ?? null);
  return (
    <ul className="divide-y divide-line border-t border-line">
      {rows.map((e) => (
        <Item key={e.id} e={e} productName={(e.product_id && productNames[e.product_id]) || e.product_name} open={open === e.id} onToggle={() => setOpen(open === e.id ? null : e.id)} />
      ))}
    </ul>
  );
}

function Item({ e, productName, open, onToggle }: { e: EnquiryRow; productName: string | null; open: boolean; onToggle: () => void }) {
  const { run, pending } = useAction();
  const [notes, setNotes] = useState(e.staff_notes ?? "");
  const phone = phoneLinks(e.phone);
  const firstName = e.name.split(" ")[0];
  const waText = encodeURIComponent(`Hello ${firstName}, this is Gupta Interior regarding your enquiry${productName ? ` about ${productName}` : ""}.`);

  return (
    <li>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-admin-surface-muted">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("font-medium", e.status === "new" && "text-ink")}>{e.name}</span>
            <Badge tone={STATUS[e.status].tone}>{STATUS[e.status].label}</Badge>
          </div>
          <p className="truncate text-sm text-ink-muted">{productName ? `${productName} — ` : ""}{e.message}</p>
        </div>
        <span className="shrink-0 text-xs text-ink-faint">{when.format(new Date(e.created_at))}</span>
        <ChevronDown className={cn("mt-0.5 size-4 shrink-0 text-ink-faint transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div className="space-y-4 bg-admin-surface-muted px-4 pt-1 pb-5">
          <div className="flex flex-wrap gap-2">
            {phone && (
              <>
                <a href={`tel:${phone.tel}`} className={buttonClass("secondary", "sm")}>
                  <Phone className="size-4" /> Call {e.phone}
                </a>
                <a href={`${phone.whatsapp}?text=${waText}`} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm")}>
                  <MessageCircle className="size-4" /> WhatsApp
                </a>
              </>
            )}
            <a href={`mailto:${e.email}?subject=${encodeURIComponent(`Your enquiry${productName ? ` about ${productName}` : ""} — Gupta Interior`)}`} className={buttonClass("secondary", "sm")}>
              <Mail className="size-4" /> {e.email}
            </a>
          </div>
          {productName && (
            <p className="text-sm">
              <span className="text-ink-muted">Product: </span>
              {e.product_id && /^[0-9a-f-]{36}$/i.test(e.product_id) ? (
                <Link href={`/admin/products/${e.product_id}`} className="font-medium underline">
                  {productName}
                </Link>
              ) : (
                <span className="font-medium">{productName}</span>
              )}
            </p>
          )}
          <blockquote className="rounded-lg border border-line bg-admin-surface p-3 text-sm whitespace-pre-wrap">{e.message}</blockquote>
          <div className="grid gap-3 sm:grid-cols-[200px_minmax(0,1fr)]">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Status</span>
              <Select value={e.status} onChange={(ev) => run(() => updateEnquiry(e.id, { status: ev.target.value as EnquiryRow["status"] }))} disabled={pending}>
                {Object.entries(STATUS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Notes for staff</span>
              <Textarea value={notes} onChange={(ev) => setNotes(ev.target.value)} rows={2} placeholder="e.g. Called on Monday, visiting showroom Saturday" />
            </label>
          </div>
          {notes !== (e.staff_notes ?? "") && (
            <Button size="sm" variant="primary" loading={pending} onClick={() => run(() => updateEnquiry(e.id, { staff_notes: notes }))}>
              Save notes
            </Button>
          )}
        </div>
      )}
    </li>
  );
}
