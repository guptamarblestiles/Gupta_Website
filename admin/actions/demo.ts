"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { DEMO, DEMO_ROLE_COOKIE } from "@/lib/demo/mode";

/** Demo mode only: look at the admin as a different role. */
export async function setDemoRole(role: "owner" | "editor" | "viewer") {
  if (!DEMO) return;
  (await cookies()).set(DEMO_ROLE_COOKIE, role, { path: "/", sameSite: "lax", httpOnly: true });
  revalidatePath("/", "layout");
}

/** Demo mode only: throw away edits and reload the sample data. */
export async function resetDemoData() {
  if (!DEMO) return;
  delete (globalThis as { __adminDemo?: unknown }).__adminDemo;
  revalidatePath("/", "layout");
}
