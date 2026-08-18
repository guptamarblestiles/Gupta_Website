/**
 * Admin login. Single password field posted to loginAction (lib/admin/actions.ts),
 * which checks it server-side against ADMIN_PASSWORD and sets the signed
 * session cookie. No client-side gating of any kind lives here — proxy.ts
 * is what actually protects /admin/*.
 */
"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction, type LoginActionResult } from "@/lib/admin/actions";

function LoginForm() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/admin";
  const [state, formAction, isPending] = useActionState<LoginActionResult, FormData>(
    loginAction,
    undefined,
  );

  return (
    <form
      action={formAction}
      className="w-full max-w-sm space-y-4 rounded-lg border border-neutral-800 bg-neutral-900 p-8"
    >
      <h1 className="text-lg font-medium text-white">Gupta Interior Admin</h1>
      <input type="hidden" name="from" value={from} />
      <div className="space-y-1">
        <label htmlFor="password" className="text-sm text-neutral-400">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
          className="w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2 text-white outline-none focus:border-neutral-500"
        />
      </div>
      {state?.status === "error" && (
        <p className="text-sm text-red-400" role="alert">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded bg-white py-2 font-medium text-neutral-950 disabled:opacity-50"
      >
        {isPending ? "Checking..." : "Log in"}
      </button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
