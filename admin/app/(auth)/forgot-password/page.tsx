import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="font-display text-3xl text-ink">Reset your password</h1>
      <p className="mt-2 mb-8 text-[15px] text-ink-muted">New team members also use this to set their first password.</p>
      <ForgotPasswordForm />
    </>
  );
}
