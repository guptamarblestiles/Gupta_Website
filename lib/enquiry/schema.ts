import { z } from "zod";

/**
 * Shared client + server validation for the enquiry form (brief section
 * 40). The same schema runs client-side (instant feedback, no round trip)
 * and again inside the Server Action (never trust a client, even our own —
 * see the Server Actions security guide).
 *
 * The length caps here are mirrored by CHECK constraints in
 * supabase/migrations/20261116090000_enquiries_abuse_limits.sql — keep the
 * two in sync.
 */
export const ENQUIRY_LIMITS = {
  name: 120,
  email: 254,
  phone: 30,
  message: 2000,
  productId: 64,
  productName: 200,
} as const;

/** Digits, spaces and the usual phone punctuation: + ( ) - . */
const PHONE_PATTERN = /^[0-9+()\-.\s]{5,30}$/;

export const enquirySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(ENQUIRY_LIMITS.name, "Name is too long."),
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .max(ENQUIRY_LIMITS.email, "Email address is too long.")
    .email("Enter a valid email address."),
  phone: z
    .string()
    .trim()
    .max(ENQUIRY_LIMITS.phone, "Phone number is too long.")
    .refine((value) => value === "" || PHONE_PATTERN.test(value), "Enter a valid phone number.")
    .optional(),
  productId: z.string().trim().max(ENQUIRY_LIMITS.productId, "Product reference is too long.").optional(),
  productName: z.string().trim().max(ENQUIRY_LIMITS.productName, "Product name is too long.").optional(),
  message: z
    .string()
    .trim()
    .min(10, "Tell us a little more — at least 10 characters.")
    .max(ENQUIRY_LIMITS.message, "Message is too long."),
});

export type EnquiryFormValues = z.infer<typeof enquirySchema>;

/** Newsletter sign-up: just an address. Stored as a labelled enquiry row. */
export const newsletterSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .max(ENQUIRY_LIMITS.email, "Email address is too long.")
    .email("Enter a valid email address."),
});
