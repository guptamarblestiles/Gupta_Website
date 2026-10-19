"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Display";
import { requestPasswordReset, setNewPassword, signIn, type FormState } from "@/actions/auth";

function PasswordInput({ id, name, autoComplete, invalid }: { id: string; name: string; autoComplete: string; invalid?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        required
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        className="pr-11"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 grid w-10 place-items-center text-ink-faint hover:text-ink"
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, undefined);
  return (
    <form action={action} className="space-y-5" noValidate>
      {notice && !state?.message && <Notice tone="info">{notice}</Notice>}
      {state?.message && <Notice tone="danger">{state.message}</Notice>}
      <input type="hidden" name="next" value={next ?? "/"} />
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="username" inputMode="email" required autoFocus />
      </Field>
      <Field label="Password" htmlFor="password">
        <PasswordInput id="password" name="password" autoComplete="current-password" />
      </Field>
      <div className="flex items-center justify-between">
        <Link href="/forgot-password" className="text-sm font-medium text-copper-strong hover:underline">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" variant="primary" size="lg" className="w-full" loading={pending}>
        Sign in
      </Button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(requestPasswordReset, undefined);
  if (state?.ok) {
    return (
      <div className="space-y-5">
        <Notice tone="success">{state.message}</Notice>
        <Link href="/login" className="block text-sm font-medium text-copper-strong hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-5" noValidate>
      {state?.message && <Notice tone="danger">{state.message}</Notice>}
      <Field label="Email" htmlFor="email" hint="We'll email you a link to choose a new password.">
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </Field>
      <Button type="submit" variant="primary" size="lg" className="w-full" loading={pending}>
        Send reset link
      </Button>
      <Link href="/login" className="block text-center text-sm text-ink-muted hover:text-ink">
        Back to sign in
      </Link>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(setNewPassword, undefined);
  return (
    <form action={action} className="space-y-5" noValidate>
      {state?.message && <Notice tone="danger">{state.message}</Notice>}
      <Field label="New password" htmlFor="password" hint="At least 10 characters. A short sentence is easy to remember." error={state?.fieldErrors?.password}>
        <PasswordInput id="password" name="password" autoComplete="new-password" invalid={Boolean(state?.fieldErrors?.password)} />
      </Field>
      <Field label="Type it again" htmlFor="confirm" error={state?.fieldErrors?.confirm}>
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" invalid={Boolean(state?.fieldErrors?.confirm)} />
      </Field>
      <Button type="submit" variant="primary" size="lg" className="w-full" loading={pending}>
        Save password
      </Button>
    </form>
  );
}
