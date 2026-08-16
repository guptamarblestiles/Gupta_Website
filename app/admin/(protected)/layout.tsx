/** Shared chrome for every /admin/* page: top nav + logout. proxy.ts is
 *  what actually enforces auth — this layout renders only once a valid
 *  session cookie has already let the request through. */
import Link from "next/link";
import { logoutAction } from "@/lib/admin/actions";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/admin" className="font-medium">
            D R Traders Admin
          </Link>
          <Link href="/admin" className="text-neutral-400 hover:text-white">
            Products
          </Link>
          <Link href="/admin/import" className="text-neutral-400 hover:text-white">
            Import
          </Link>
        </nav>
        <form action={logoutAction}>
          <button type="submit" className="text-sm text-neutral-400 hover:text-white">
            Log out
          </button>
        </form>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
