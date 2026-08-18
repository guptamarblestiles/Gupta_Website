/**
 * Sends an email notification to Gupta Interior's own inbox whenever a new enquiry
 * comes in, via Gmail SMTP (Nodemailer) using an App Password — not the
 * Google account password itself. Requires GMAIL_USER and
 * GMAIL_APP_PASSWORD env vars; if either is unset, this quietly no-ops
 * (logged, not thrown) so a missing credential never breaks the enquiry
 * flow itself — the enquiry is already safely in Supabase by the time this
 * runs (see lib/enquiry/actions.ts), email is a notification on top, not
 * the source of truth.
 */
import nodemailer from "nodemailer";
import type { EnquiryInput } from "@/types/product";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendEnquiryNotification(input: EnquiryInput): Promise<void> {
  const user = process.env.GMAIL_USER;
  const appPassword = process.env.GMAIL_APP_PASSWORD;

  if (!user || !appPassword) {
    console.warn("Enquiry email skipped: GMAIL_USER/GMAIL_APP_PASSWORD not configured.");
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass: appPassword },
  });

  const productLine = input.productName ? `<p><strong>Product:</strong> ${escapeHtml(input.productName)}</p>` : "";

  try {
    await transporter.sendMail({
      from: `"Gupta Interior Website" <${user}>`,
      to: user,
      replyTo: input.email,
      subject: `New enquiry from ${input.name}`,
      html: `
        <h2>New website enquiry</h2>
        <p><strong>Name:</strong> ${escapeHtml(input.name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(input.email)}</p>
        ${input.phone ? `<p><strong>Phone:</strong> ${escapeHtml(input.phone)}</p>` : ""}
        ${productLine}
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(input.message).replace(/\n/g, "<br />")}</p>
      `,
    });
  } catch (err) {
    // Never let an email failure surface as an enquiry-submission failure —
    // the enquiry row already exists in Supabase by the time this is
    // called. Log for follow-up instead.
    console.error("Failed to send enquiry notification email:", err);
  }
}
