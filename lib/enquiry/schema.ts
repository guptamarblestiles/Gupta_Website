import { z } from "zod";

/**
 * Shared client + server validation for the enquiry form (brief section
 * 40). The same schema runs client-side (instant feedback, no round trip)
 * and again inside the Server Action (never trust a client, even our own —
 * see the Server Actions security guide).
 */
export const enquirySchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(120, "Name is too long."),
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .email("Enter a valid email address."),
  phone: z.string().trim().max(30, "Phone number is too long.").optional(),
  productId: z.string().trim().optional(),
  productName: z.string().trim().optional(),
  message: z
    .string()
    .trim()
    .min(10, "Tell us a little more — at least 10 characters.")
    .max(2000, "Message is too long."),
});

export type EnquiryFormValues = z.infer<typeof enquirySchema>;
