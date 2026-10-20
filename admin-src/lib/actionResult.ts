/**
 * Shape every server action returns, so the UI can always show an honest
 * message: what was saved, and separately whether the public website was
 * refreshed (see lib/publicSite.ts).
 */
export type PublicSync = "refreshed" | "failed" | "not_configured" | "not_needed";

export type ActionSuccess<T> = { ok: true; message: string; data?: T; publicSync?: PublicSync; warning?: string };
export type ActionFailure = { ok: false; message: string; fieldErrors?: Record<string, string> };
export type ActionResult<T = undefined> = ActionSuccess<T> | ActionFailure;

type PgLikeError = { code?: string; message?: string; details?: string; constraint?: string };

/** Turn database / permission errors into sentences a shop owner can act on. */
export function friendlyError(err: unknown): string {
  if (err instanceof Error && err.name === "PermissionError") return err.message;
  const e = (err ?? {}) as PgLikeError;
  const text = `${e.message ?? ""} ${e.details ?? ""}`;
  switch (e.code) {
    case "23505":
      if (text.includes("product_code")) return "Another product already uses this product code.";
      if (text.includes("slug")) return "Another item already uses this web address (slug). Change the slug and try again.";
      if (text.includes("sha256")) return "This exact PDF is already in the library.";
      if (text.includes("name")) return "That name is already taken.";
      return "This would create a duplicate of an existing record.";
    case "23503":
      return "This is still linked to other records, so it can't be removed yet.";
    case "23514":
      return "One of the values isn't allowed. Check the highlighted fields.";
    case "42501":
      return "You don't have permission to do this.";
    case "P0001":
      return e.message ?? "The change was rejected.";
    case "PGRST116":
      return "That record no longer exists. It may have been deleted by someone else.";
  }
  if (err instanceof TypeError && /fetch/i.test(err.message)) {
    return "Couldn't reach the database. Check your internet connection and try again.";
  }
  if (err instanceof Error) return err.message;
  if (typeof e.message === "string" && e.message) return e.message;
  return "Something went wrong. Please try again.";
}

export function fail(message: string, fieldErrors?: Record<string, string>): ActionFailure {
  return { ok: false, message, fieldErrors };
}

/** What the public website shows after a save, in plain words. */
export function syncNote(sync: PublicSync): string {
  switch (sync) {
    case "refreshed":
      return "The website has been updated.";
    case "failed":
      return "Saved, but the website's cache couldn't be refreshed. Product pages already show the change; the homepage may take until the next refresh.";
    case "not_configured":
      return "Saved. (Website refresh isn't set up yet — see admin/README.md.)";
    default:
      return "";
  }
}
