import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NewPasswordForm } from "@admin/components/auth/AuthForms";
import { createClient } from "@admin/lib/supabase/server";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  // Reached from the emailed link (/auth/confirm signs the user in first).
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/admin/login?linkExpired=1");
  return (
    <>
      <h1 className="font-display text-3xl text-ink">Choose a new password</h1>
      <p className="mt-2 mb-8 text-[15px] text-ink-muted">You&apos;ll stay signed in on this device afterwards.</p>
      <NewPasswordForm />
    </>
  );
}
