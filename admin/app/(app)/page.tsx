import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileUp, FolderTree, ImageOff, Inbox, Plus, ScanSearch, TriangleAlert } from "lucide-react";
import { requireRole, roleAtLeast } from "@/lib/auth";
import { getOverview } from "@/lib/data/overview";
import { Badge, Card, CardHeader, EmptyState, Notice, PageHeader } from "@/components/ui/Display";
import { activityHref, describeActivity } from "@/lib/activity";
import { plural, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const session = await requireRole("viewer");
  const { denied } = await searchParams;
  const canEdit = roleAtLeast(session.role, "editor");
  const o = await getOverview(canEdit);
  const c = o.counts;
  const name = session.displayName?.split(" ")[0] || session.email.split("@")[0];

  const issues = [
    c.noImagePublished > 0 && {
      tone: "danger" as const,
      text: `${plural(c.noImagePublished, "published product")} ${c.noImagePublished === 1 ? "has" : "have"} no image — customers see a blank card.`,
      href: "/products?status=published&images=none",
    },
    o.broken.length > 0 && {
      tone: "danger" as const,
      text: `${plural(o.broken.length, "product image")} ${o.broken.length === 1 ? "points" : "point"} to a file that no longer exists.`,
      href: "/media?tab=broken",
    },
    c.pdfsMissingFile > 0 && {
      tone: "warning" as const,
      text: `${plural(c.pdfsMissingFile, "PDF")} in the library ${c.pdfsMissingFile === 1 ? "has" : "have"} no uploaded file, so the download shows “unavailable”.`,
      href: "/pdfs",
    },
    o.nearDuplicateCodes.length > 0 && {
      tone: "warning" as const,
      text: `${plural(o.nearDuplicateCodes.length, "product code")} ${o.nearDuplicateCodes.length === 1 ? "looks" : "look"} duplicated (e.g. ${o.nearDuplicateCodes[0].map((p) => p.product_code).join(" / ")}).`,
      href: `/products?q=${encodeURIComponent(o.nearDuplicateCodes[0][0].product_code)}`,
    },
    c.review > 0 && {
      tone: "info" as const,
      text: `${plural(c.review, "product")} ${c.review === 1 ? "is" : "are"} waiting for review before publishing.`,
      href: "/products?status=review",
    },
    c.pendingCandidates > 0 && {
      tone: "info" as const,
      text: `${plural(c.pendingCandidates, "tile")} found in PDFs ${c.pendingCandidates === 1 ? "is" : "are"} waiting to be checked.`,
      href: "/pdfs",
    },
  ].filter(Boolean) as { tone: "danger" | "warning" | "info"; text: string; href: string }[];

  return (
    <>
      {denied && (
        <Notice tone="warning" className="mb-6">
          That page needs a different permission level. Ask the owner if you need access.
        </Notice>
      )}
      <PageHeader eyebrow="Overview" title={`Hello, ${name}`} description="Here's the state of the website catalogue right now." />

      <section aria-label="Catalogue numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="On the website" value={c.published} href="/products?status=published" tone="success" />
        <Stat label="Needs review" value={c.review} href="/products?status=review" tone={c.review ? "warning" : undefined} />
        <Stat label="Drafts" value={c.draft} href="/products?status=draft" />
        <Stat label="PDF catalogues" value={c.pdfs} href="/pdfs" />
      </section>

      {canEdit && (
        <section aria-label="Quick actions" className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Quick href="/products/new" icon={<Plus className="size-5" />} title="Add product" text="Enter a tile by hand" />
          <Quick href="/pdfs?upload=1" icon={<FileUp className="size-5" />} title="Upload PDF" text="Add a brand catalogue" />
          <Quick href="/pdfs" icon={<ScanSearch className="size-5" />} title="Import from PDF" text="Turn pages into products" />
          <Quick href="/categories" icon={<FolderTree className="size-5" />} title="Categories" text="Organise the catalogue" />
        </section>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Needs attention" description="Only things that affect what customers see or that block publishing." />
            {issues.length === 0 ? (
              <EmptyState title="All clear" className="py-10">
                Nothing needs fixing right now.
              </EmptyState>
            ) : (
              <ul className="divide-y divide-line">
                {issues.map((i) => (
                  <li key={i.text}>
                    <Link href={i.href} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-muted">
                      {i.tone === "danger" ? (
                        <ImageOff className="size-5 shrink-0 text-danger" aria-hidden />
                      ) : (
                        <TriangleAlert className={i.tone === "warning" ? "size-5 shrink-0 text-warning" : "size-5 shrink-0 text-info"} aria-hidden />
                      )}
                      <span className="flex-1 text-sm">{i.text}</span>
                      <ArrowRight className="size-4 shrink-0 text-ink-faint" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-line px-5 py-3 text-xs text-ink-faint">
              <Link href="/products?images=none" className="hover:text-ink">
                {plural(c.noImageAll, "product")} without images
              </Link>
              <Link href="/products?pdf=none" className="hover:text-ink">
                {plural(c.noPdf, "product")} not linked to a PDF
              </Link>
              <Link href="/products?status=archived" className="hover:text-ink">
                {c.archived} archived
              </Link>
            </div>
          </Card>

          <Card>
            <CardHeader title="Recent changes" action={<Link href="/activity" className="text-sm font-medium text-copper-strong hover:underline">See all</Link>} />
            {o.activity.length === 0 ? (
              <EmptyState title="No changes recorded yet" className="py-10" />
            ) : (
              <ul className="divide-y divide-line">
                {o.activity.map((a) => {
                  const href = activityHref(a);
                  const body = (
                    <>
                      <span className="min-w-0 flex-1 truncate">
                        <span className="font-medium">{a.actor_email?.split("@")[0] ?? "Import script"}</span> {describeActivity(a)}
                      </span>
                      <span className="shrink-0 text-xs text-ink-faint">{timeAgo(a.occurred_at)}</span>
                    </>
                  );
                  return (
                    <li key={a.id}>
                      {href ? (
                        <Link href={href} className="flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-surface-muted">
                          {body}
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3 px-5 py-2.5 text-sm">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        {canEdit && (
          <Card className="self-start">
            <CardHeader
              title="Latest enquiries"
              description={c.newEnquiries ? `${c.newEnquiries} new` : undefined}
              action={<Link href="/enquiries" className="text-sm font-medium text-copper-strong hover:underline">Open</Link>}
            />
            {o.enquiries.length === 0 ? (
              <EmptyState icon={<Inbox className="size-5" />} title="No enquiries yet" className="py-10" />
            ) : (
              <ul className="divide-y divide-line">
                {o.enquiries.map((e) => (
                  <li key={e.id}>
                    <Link href={`/enquiries?open=${e.id}`} className="flex items-start gap-3 px-5 py-3 hover:bg-surface-muted">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{e.name}</div>
                        <div className="truncate text-xs text-ink-faint">{e.product_name ?? "General enquiry"}</div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {e.status === "new" && <Badge tone="copper">New</Badge>}
                        <span className="text-xs text-ink-faint">{timeAgo(e.created_at)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </>
  );
}

function Stat({ label, value, href, tone }: { label: string; value: number; href: string; tone?: "success" | "warning" }) {
  return (
    <Link href={href} className="group rounded-xl border border-line bg-surface px-4 py-3.5 shadow-card transition-colors hover:border-line-strong">
      <div className="text-xs font-medium text-ink-muted">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-[28px] leading-none text-ink tabular-nums">{value.toLocaleString("en-IN")}</span>
        {tone && <span className={tone === "success" ? "size-2 rounded-full bg-success" : "size-2 rounded-full bg-warning"} aria-hidden />}
      </div>
    </Link>
  );
}

function Quick({ href, icon, title, text }: { href: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-card transition-colors hover:border-copper-ring hover:bg-copper-soft/40">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-copper-soft text-copper">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{title}</span>
        <span className="block truncate text-xs text-ink-faint">{text}</span>
      </span>
    </Link>
  );
}

