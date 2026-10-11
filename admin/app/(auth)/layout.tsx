import { Brand } from "@/components/shell/Brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,560px)]">
      <div className="relative hidden overflow-hidden bg-ink lg:block" aria-hidden>
        <div
          className="absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "linear-gradient(90deg, #f6ece2 1px, transparent 1px), linear-gradient(#f6ece2 1px, transparent 1px)",
            backgroundSize: "88px 88px",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 p-12 text-white/90">
          <p className="font-display text-4xl leading-tight">
            Every tile on the website,
            <br />
            <span className="text-copper-ring">managed from one place.</span>
          </p>
          <p className="mt-4 max-w-md text-sm text-white/60">
            Products, catalogues, images and enquiries for guptainterior.in.
          </p>
        </div>
      </div>
      <div className="flex flex-col justify-center px-5 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-10">
            <Brand />
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}
