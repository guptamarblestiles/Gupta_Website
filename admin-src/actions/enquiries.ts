"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAction } from "@admin/lib/run";
import { fail, type ActionResult } from "@admin/lib/actionResult";

const schema = z.object({
  status: z.enum(["new", "contacted", "in_progress", "closed"]).optional(),
  staff_notes: z.string().max(4000).nullish(),
});

export async function updateEnquiry(id: string, input: z.input<typeof schema>): Promise<ActionResult> {
  return runAction("editor", async ({ db, session }) => {
    const parsed = schema.safeParse(input);
    if (!parsed.success) return fail("Notes are too long.");
    const patch: Record<string, unknown> = { ...parsed.data, handled_by: session.userId };
    if (patch.staff_notes !== undefined) patch.staff_notes = (patch.staff_notes as string | null)?.trim() || null;
    const { error } = await db.from("enquiries").update(patch).eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/enquiries");
    revalidatePath("/admin", "layout");
    return { ok: true, message: parsed.data.status ? "Status updated." : "Notes saved." };
  });
}
