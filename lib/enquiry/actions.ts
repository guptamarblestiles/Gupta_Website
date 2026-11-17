"use server";

import { enquirySchema, newsletterSchema } from "@/lib/enquiry/schema";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { sendEnquiryNotification } from "@/lib/enquiry/email";
import { CONTACT_INFO } from "@/lib/contact";
import type { EnquiryInput } from "@/types/product";

export type EnquiryActionResult =
  | { status: "success" }
  | { status: "error"; message: string; fieldErrors?: Partial<Record<keyof EnquiryInput, string>> }
  | { status: "not_configured"; message: string };

/** Form payload plus the honeypot. `website` is a hidden field real visitors
 *  never see or fill; if it arrives non-empty the submission is a bot. */
export type EnquirySubmission = EnquiryInput & { website?: string };

const NOT_CONFIGURED_MESSAGE =
  `Online enquiries aren't connected yet. Please reach us directly at ${CONTACT_INFO.email} or ${CONTACT_INFO.phoneDisplay} in the meantime.`;
const SAVE_FAILED_MESSAGE =
  "Something went wrong submitting your enquiry. Please try again or contact us directly.";

/**
 * Inserts the row, then notifies the owner. Only the six public columns are
 * written (status/staff_notes/handled_by are staff-only; the migration
 * 20261116090000 also enforces that at the database level).
 *
 * A failed insert is reported honestly as an error. A failed email never
 * turns a stored lead into an error for the visitor — it is logged instead.
 */
async function saveAndNotify(
  data: EnquiryInput,
  subject?: string,
): Promise<EnquiryActionResult> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { status: "not_configured", message: NOT_CONFIGURED_MESSAGE };
  }

  const { error } = await supabase.from("enquiries").insert({
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    product_id: data.productId || null,
    product_name: data.productName || null,
    message: data.message,
  });

  if (error) {
    console.error("Failed to save enquiry:", error.message);
    return { status: "error", message: SAVE_FAILED_MESSAGE };
  }

  // Awaited (not fire-and-forget) — on Vercel's serverless model, work
  // kicked off without awaiting can be cut short once the response is sent.
  // The lead is already stored, so an email failure must not reach the
  // visitor as an error; it is logged for follow-up.
  try {
    await sendEnquiryNotification(data, subject);
  } catch (err) {
    console.error("Enquiry saved but notification email failed:", err);
  }

  return { status: "success" };
}

export async function submitEnquiry(input: EnquirySubmission): Promise<EnquiryActionResult> {
  // Honeypot: pretend success, store and send nothing.
  if (typeof input?.website === "string" && input.website.trim() !== "") {
    return { status: "success" };
  }

  const parsed = enquirySchema.safeParse(input);

  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof EnquiryInput, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !(key in fieldErrors)) {
        fieldErrors[key as keyof EnquiryInput] = issue.message;
      }
    }
    return {
      status: "error",
      message: "Please fix the highlighted fields and try again.",
      fieldErrors,
    };
  }

  return saveAndNotify(parsed.data);
}

/**
 * Newsletter sign-up from the homepage CTA band. There is no subscribers
 * table, so the address is stored as a clearly labelled row in the same
 * enquiries table (name "Newsletter subscriber") and the owner is notified
 * through the same email path, so the request is never silently dropped.
 */
export async function subscribeNewsletter(input: {
  email: string;
  website?: string;
}): Promise<EnquiryActionResult> {
  if (typeof input?.website === "string" && input.website.trim() !== "") {
    return { status: "success" };
  }

  const parsed = newsletterSchema.safeParse({ email: input?.email });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please enter a valid email address.",
      fieldErrors: { email: parsed.error.issues[0]?.message },
    };
  }

  return saveAndNotify(
    {
      name: "Newsletter subscriber",
      email: parsed.data.email,
      message: "Newsletter subscription request",
    },
    "New newsletter subscription request",
  );
}
