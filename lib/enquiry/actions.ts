"use server";

import { enquirySchema } from "@/lib/enquiry/schema";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { EnquiryInput } from "@/types/product";

export type EnquiryActionResult =
  | { status: "success" }
  | { status: "error"; message: string; fieldErrors?: Partial<Record<keyof EnquiryInput, string>> }
  | { status: "not_configured"; message: string };

/**
 * Would insert into Supabase's public.enquiries table — see
 * supabase/migrations/20260815120000_create_enquiries_table.sql for the
 * schema + insert-only RLS policy this expects, ready to apply once real
 * Supabase credentials exist. Until NEXT_PUBLIC_SUPABASE_URL and
 * NEXT_PUBLIC_SUPABASE_ANON_KEY are set, getSupabaseServerClient() returns
 * null and this returns "not_configured" instead of crashing or silently
 * pretending to succeed.
 */
export async function submitEnquiry(input: EnquiryInput): Promise<EnquiryActionResult> {
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

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return {
      status: "not_configured",
      message:
        "Online enquiries aren't connected yet. Please reach us directly at enquiries@drtraders.com or +91 00000 00000 in the meantime.",
    };
  }

  const { error } = await supabase.from("enquiries").insert({
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone || null,
    product_id: parsed.data.productId || null,
    product_name: parsed.data.productName || null,
    message: parsed.data.message,
  });

  if (error) {
    return {
      status: "error",
      message: "Something went wrong submitting your enquiry. Please try again or contact us directly.",
    };
  }

  return { status: "success" };
}
