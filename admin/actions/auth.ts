"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_URL, isSupabaseConfigured } from "@/lib/env";
import { getAdminSession } from "@/lib/auth";

export type FormState = { ok?: boolean; message?: string; fieldErrors?: Record<string, string> } | undefined;

function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") ? next : "/";
}

async function siteOrigin(): Promise<string> {
  if (ADMIN_URL) return ADMIN_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

const MIN_PASSWORD = 10;

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return { message: "The admin app isn't connected to Supabase yet. See admin/README.md." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { message: "Enter your email and password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Same message for unknown email and wrong password, on purpose.
    if (/rate|too many/i.test(error.message)) return { message: "Too many attempts. Wait a few minutes and try again." };
    if (/confirm/i.test(error.message)) return { message: "This email address hasn't been confirmed yet. Use “Forgot password” to set one." };
    return { message: "That email and password don't match. Check them and try again." };
  }

  const session = await getAdminSession();
  if (!session) {
    await supabase.auth.signOut();
    return { message: "This account doesn't have access to the admin panel. Ask the shop owner to add you." };
  }
  redirect(safeNext(formData.get("next")));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login?signedOut=1");
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!z.string().email().safeParse(email).success) return { message: "Enter the email address you sign in with." };
  if (!isSupabaseConfigured) return { message: "The admin app isn't connected to Supabase yet." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteOrigin()}/auth/confirm?next=/reset-password`,
  });
  if (error && /rate/i.test(error.message)) {
    return { message: "Too many reset emails were requested. Wait a few minutes and try again." };
  }
  // Never reveal whether an account exists for this address.
  return {
    ok: true,
    message: "If that email belongs to an admin account, a reset link is on its way. It works once, for one hour, in this browser.",
  };
}

export async function setNewPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < MIN_PASSWORD) return { fieldErrors: { password: `Use at least ${MIN_PASSWORD} characters.` } };
  if (password !== confirm) return { fieldErrors: { confirm: "The two passwords don't match." } };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return { message: "This reset link has expired. Request a new one." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { message: /same|different/i.test(error.message) ? "Choose a password you haven't used before." : error.message };
  }
  const admin = await getAdminSession();
  redirect(admin ? "/?flash=Password%20updated" : "/login?flash=Password%20updated");
}

/** Change password while signed in: re-checks the current one first. */
export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const session = await getAdminSession();
  if (!session) return { message: "Your session has ended. Please sign in again." };
  if (password.length < MIN_PASSWORD) return { fieldErrors: { password: `Use at least ${MIN_PASSWORD} characters.` } };
  if (password !== confirm) return { fieldErrors: { confirm: "The two passwords don't match." } };

  const supabase = await createClient();
  const check = await supabase.auth.signInWithPassword({ email: session.email, password: current });
  if (check.error) return { fieldErrors: { current: "Your current password isn't right." } };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { message: error.message };
  return { ok: true, message: "Password changed." };
}
