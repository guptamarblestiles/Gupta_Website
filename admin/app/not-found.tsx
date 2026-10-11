import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-copper-strong">Not found</p>
        <h1 className="mt-2 font-display text-3xl">This page doesn&apos;t exist</h1>
        <p className="mt-2 text-ink-muted">It may have been deleted, or the link is out of date.</p>
        <Link href="/" className="mt-6 inline-block font-medium text-copper-strong hover:underline">
          Go to the overview
        </Link>
      </div>
    </main>
  );
}
