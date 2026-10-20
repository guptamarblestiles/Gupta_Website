import type { Metadata } from "next";
import { LoginForm } from "@admin/components/auth/AuthForms";
import { Notice } from "@admin/components/ui/Display";
import { isSupabaseConfigured } from "@admin/lib/env";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const notice = params.linkExpired
    ? "That link has expired or was already used. Request a new one below."
    : params.signedOut
      ? "You've been signed out."
      : undefined;
  return (
    <>
      <h1 className="font-display text-3xl text-ink">Welcome back</h1>
      <p className="mt-2 mb-8 text-[15px] text-ink-muted">Sign in to manage the Gupta Interior website.</p>
      {!isSupabaseConfigured && (
        <Notice tone="warning" title="Not connected yet" className="mb-5">
          Supabase environment variables are missing on this deployment. See admin/README.md.
        </Notice>
      )}
      <LoginForm next={params.next} notice={notice} />
      <p className="mt-10 text-xs leading-relaxed text-ink-faint">
        Access is by invitation from the shop owner. There is no public sign-up.
      </p>
    </>
  );
}
