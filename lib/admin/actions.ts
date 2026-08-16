"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, checkAdminPassword, createSessionToken } from "@/lib/admin/session";

export type LoginActionResult = { status: "error"; message: string } | void;

/** Checks the submitted password against ADMIN_PASSWORD and, on success,
 *  sets the signed httpOnly session cookie before redirecting. */
export async function loginAction(
  _prevState: LoginActionResult,
  formData: FormData,
): Promise<LoginActionResult> {
  const password = String(formData.get("password") ?? "");
  const from = String(formData.get("from") ?? "/admin");

  if (!checkAdminPassword(password)) {
    return { status: "error", message: "Incorrect password." };
  }

  const jar = await cookies();
  jar.set(ADMIN_SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  redirect(from.startsWith("/admin") ? from : "/admin");
}

export async function logoutAction() {
  const jar = await cookies();
  jar.delete(ADMIN_SESSION_COOKIE);
  redirect("/admin/login");
}
