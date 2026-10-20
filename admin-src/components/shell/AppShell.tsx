"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  BookOpen,
  ChevronRight,
  FileText,
  FolderTree,
  Images,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Plus,
  Search,
  SlidersHorizontal,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Brand } from "@admin/components/shell/Brand";
import { DemoBanner } from "@admin/components/shell/DemoBanner";
import { signOut } from "@admin/actions/auth";
import { cn } from "@admin/lib/cn";
import type { AdminRole } from "@admin/lib/auth";

type NavItem = { href: string; label: string; icon: LucideIcon; min?: AdminRole; badge?: number };
type NavGroup = { label?: string; items: NavItem[] };

const RANK: Record<AdminRole, number> = { viewer: 0, editor: 1, owner: 2 };

function navGroups(newEnquiries: number): NavGroup[] {
  return [
    { items: [{ href: "/admin", label: "Overview", icon: LayoutDashboard }] },
    {
      label: "Catalogue",
      items: [
        { href: "/admin/products", label: "Products", icon: Package },
        { href: "/admin/pdfs", label: "PDF library", icon: FileText },
        { href: "/admin/media", label: "Images", icon: Images },
        { href: "/admin/categories", label: "Categories", icon: FolderTree },
        { href: "/admin/filters", label: "Filters & collections", icon: SlidersHorizontal },
      ],
    },
    {
      label: "Website",
      items: [
        { href: "/admin/catalogues", label: "Homepage catalogues", icon: BookOpen },
        { href: "/admin/enquiries", label: "Enquiries", icon: Inbox, min: "editor", badge: newEnquiries },
      ],
    },
    {
      label: "Admin",
      items: [
        { href: "/admin/activity", label: "Activity log", icon: Activity },
        { href: "/admin/team", label: "Team & permissions", icon: Users, min: "owner" },
        { href: "/admin/account", label: "My account", icon: UserCog },
      ],
    },
  ];
}

const SEGMENT_LABELS: Record<string, string> = {
  products: "Products",
  pdfs: "PDF library",
  media: "Images",
  categories: "Categories",
  filters: "Filters & collections",
  catalogues: "Homepage catalogues",
  enquiries: "Enquiries",
  activity: "Activity log",
  team: "Team & permissions",
  account: "My account",
  new: "New",
  import: "Import products",
  preview: "Preview",
};

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  children,
  user,
  newEnquiries,
  demo,
}: {
  children: ReactNode;
  user: { name: string; email: string; role: AdminRole; roleLabel: string };
  newEnquiries: number;
  demo?: boolean;
}) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const groups = navGroups(newEnquiries)
    .map((g) => ({ ...g, items: g.items.filter((i) => RANK[user.role] >= RANK[i.min ?? "viewer"]) }))
    .filter((g) => g.items.length);

  const [drawerPath, setDrawerPath] = useState(pathname);
  if (pathname !== drawerPath) {
    // Navigating closes the mobile menu.
    setDrawerPath(pathname);
    setDrawer(false);
  }

  const nav = (
    <nav aria-label="Main" className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
      {groups.map((group, gi) => (
        <div key={gi}>
          {group.label && <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{group.label}</div>}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] transition-colors",
                      active ? "bg-admin-surface font-medium text-ink shadow-card ring-1 ring-line" : "text-ink-muted hover:bg-admin-surface/70 hover:text-ink",
                    )}
                  >
                    {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-copper" aria-hidden />}
                    <item.icon className={cn("size-[18px] shrink-0", active ? "text-copper" : "text-ink-faint group-hover:text-ink-muted")} aria-hidden />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge ? (
                      <span className="rounded-full bg-copper px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white" aria-label={`${item.badge} new`}>
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <a href="#main" className="sr-only z-50 rounded bg-ink px-3 py-2 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-sunken/60 lg:flex">
        <div className="border-b border-line px-5 py-4">
          <Link href="/admin" aria-label="Overview">
            <Brand />
          </Link>
        </div>
        {nav}
        <UserFooter user={user} />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[min(300px,85vw)] animate-slide-in flex-col bg-canvas shadow-pop">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <Brand />
              <button onClick={() => setDrawer(false)} className="rounded-md p-2 text-ink-muted hover:bg-sunken" aria-label="Close menu">
                <X className="size-5" />
              </button>
            </div>
            {nav}
            <UserFooter user={user} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        {demo && <DemoBanner role={user.role} />}
        <TopBar onMenu={() => setDrawer(true)} canEdit={RANK[user.role] >= RANK.editor} />
        <main id="main" className="mx-auto w-full max-w-[1280px] flex-1 px-4 pt-6 pb-16 sm:px-6 lg:px-10 lg:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const parts = segments[0] === "admin" ? segments.slice(1) : segments;
  if (!parts.length) return <span className="truncate font-medium text-ink">Overview</span>;
  return (
    <ol className="flex min-w-0 items-center gap-1.5 text-sm">
      {parts.map((part, i) => {
        const href = `/admin/${parts.slice(0, i + 1).join("/")}`;
        const label = SEGMENT_LABELS[part] ?? (i === parts.length - 1 ? "Details" : "Item");
        const last = i === parts.length - 1;
        const isId = !SEGMENT_LABELS[part];
        return (
          <li key={href} className={cn("flex min-w-0 items-center gap-1.5", i < parts.length - 2 && "hidden sm:flex")}>
            {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-ink-faint" aria-hidden />}
            {last ? (
              <span aria-current="page" className="truncate font-medium text-ink">
                {label}
              </span>
            ) : isId ? (
              <Link href={href} className="truncate text-ink-muted hover:text-ink">
                Details
              </Link>
            ) : (
              <Link href={href} className="truncate text-ink-muted hover:text-ink">
                {label}
              </Link>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function TopBar({ onMenu, canEdit }: { onMenu: () => void; canEdit: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-canvas/90 px-3 backdrop-blur sm:px-6 lg:px-10">
      <button onClick={onMenu} className="rounded-md p-2 text-ink-muted hover:bg-sunken lg:hidden" aria-label="Open menu">
        <Menu className="size-5" />
      </button>
      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <Breadcrumb />
      </nav>
      <form
        role="search"
        className="relative hidden md:block"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(q.trim() ? `/admin/products?q=${encodeURIComponent(q.trim())}` : "/admin/products");
        }}
      >
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
        <label htmlFor="global-search" className="sr-only">
          Search products by name or code
        </label>
        <input
          id="global-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products…"
          className="h-9 w-56 rounded-lg border border-line bg-admin-surface pr-3 pl-9 text-sm placeholder:text-ink-faint focus:border-copper focus:ring-2 focus:ring-copper-ring/60 focus:outline-none lg:w-72"
        />
      </form>
      {canEdit && <QuickCreate />}
    </header>
  );
}

function QuickCreate() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  const items = [
    { href: "/admin/products/new", label: "New product", detail: "Add a tile by hand" },
    { href: "/admin/pdfs?upload=1", label: "Upload a PDF", detail: "Add a brand catalogue" },
    { href: "/admin/pdfs", label: "Import from a PDF", detail: "Turn catalogue pages into products" },
  ];
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ink px-3 text-sm font-medium text-white shadow-card hover:bg-ink/85"
      >
        <Plus className="size-4" aria-hidden />
        <span className="hidden sm:inline">New</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-64 animate-fade-in rounded-xl border border-line bg-admin-surface p-1.5 shadow-pop">
          {items.map((i) => (
            <Link key={i.label} href={i.href} role="menuitem" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 hover:bg-sunken">
              <div className="text-sm font-medium text-ink">{i.label}</div>
              <div className="text-xs text-ink-faint">{i.detail}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function UserFooter({ user }: { user: { name: string; email: string; roleLabel: string } }) {
  const initials = user.name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join("");
  return (
    <div className="border-t border-line p-3">
      <div className="flex items-center gap-3 rounded-lg px-2 py-2">
        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-copper-soft text-sm font-semibold text-copper-strong">{initials}</div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-ink">{user.name}</div>
          <div className="truncate text-xs text-ink-faint">{user.roleLabel}</div>
        </div>
        <form action={signOut}>
          <button type="submit" className="rounded-md p-2 text-ink-faint hover:bg-admin-surface hover:text-ink" aria-label="Sign out" title="Sign out">
            <LogOut className="size-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
