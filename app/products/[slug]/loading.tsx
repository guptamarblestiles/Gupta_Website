export default function ProductLoading() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-24" aria-busy="true">
      <div className="grid gap-10 md:grid-cols-2">
        <div className="aspect-square animate-pulse bg-zinc-200/60" />
        <div className="space-y-4">
          <div className="h-8 w-2/3 animate-pulse bg-zinc-200/60" />
          <div className="h-4 w-1/3 animate-pulse bg-zinc-200/60" />
          <div className="h-24 w-full animate-pulse bg-zinc-200/60" />
        </div>
      </div>
    </main>
  );
}
