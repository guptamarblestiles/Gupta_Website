import "server-only";
import { assertRole, type AdminRole, type AdminSession } from "@admin/lib/auth";
import { createClient } from "@admin/lib/supabase/server";
import { friendlyError, type ActionFailure, type ActionSuccess } from "@admin/lib/actionResult";

type Ctx = { session: AdminSession; db: Awaited<ReturnType<typeof createClient>> };

/**
 * Wraps every mutating server action: re-checks the caller's role on the
 * server (never trusting that the button was hidden), hands over a
 * user-scoped client so RLS applies, and converts any thrown error into a
 * readable ActionResult instead of a crashed page.
 */
export async function runAction<T>(
  min: AdminRole,
  fn: (ctx: Ctx) => Promise<ActionSuccess<T> | ActionFailure>,
): Promise<ActionSuccess<T> | ActionFailure> {
  try {
    const session = await assertRole(min);
    const db = await createClient();
    return await fn({ session, db });
  } catch (err) {
    // redirect()/notFound() must propagate to Next.
    if (err && typeof err === "object" && "digest" in err) throw err;
    return { ok: false, message: friendlyError(err) };
  }
}
