/**
 * Client-side email notification via EmailJS — sends directly from the
 * visitor's browser to Gupta's inbox, no server SMTP credentials needed
 * (unlike lib/enquiry/email.ts's Gmail App Password route, which stays as
 * a fallback). Requires NEXT_PUBLIC_EMAILJS_SERVICE_ID,
 * NEXT_PUBLIC_EMAILJS_TEMPLATE_ID, NEXT_PUBLIC_EMAILJS_PUBLIC_KEY — if any
 * is unset, this quietly no-ops so a missing credential never blocks the
 * enquiry, which is already saved in Supabase by the time this runs.
 */
import emailjs from "@emailjs/browser";
import type { EnquiryInput } from "@/types/product";

export async function sendEnquiryEmailJs(input: EnquiryInput): Promise<void> {
  const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
  const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    console.warn("Enquiry email skipped: EmailJS env vars not configured.");
    return;
  }

  try {
    await emailjs.send(
      serviceId,
      templateId,
      {
        name: input.name,
        email: input.email,
        phone: input.phone || "—",
        product_name: input.productName || "—",
        message: input.message,
      },
      { publicKey },
    );
  } catch (err) {
    // Never let an email failure surface as an enquiry-submission failure —
    // the enquiry row already exists in Supabase by the time this is called.
    console.error("Failed to send EmailJS enquiry notification:", err);
  }
}
