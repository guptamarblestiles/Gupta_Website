"use client";

import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { enquirySchema } from "@/lib/enquiry/schema";
import { submitEnquiry } from "@/lib/enquiry/actions";
import { sendEnquiryEmailJs } from "@/lib/enquiry/emailjs";
import type { EnquiryInput } from "@/types/product";

type EnquiryFormProps = {
  /** When present (e.g. from the product detail page), the Product field
   *  is pre-filled and locked to this item instead of being free text. */
  product?: { id: string; name: string };
};

const EMPTY_VALUES: EnquiryInput = { name: "", email: "", phone: "", message: "" };

type FieldErrors = Partial<Record<keyof EnquiryInput, string>>;

/**
 * Name/Email/Phone/Product/Message enquiry form (brief section 40).
 * Validates with the same zod schema client-side (instant feedback) and
 * again inside the Server Action (never trust a client — see the Server
 * Actions security guide) before it would reach Supabase. Supabase isn't
 * connected yet, so a "not configured" result is expected right now, not
 * an error state — the form still fails gracefully instead of crashing.
 */
export function EnquiryForm({ product }: EnquiryFormProps) {
  const [values, setValues] = useState<EnquiryInput>({
    ...EMPTY_VALUES,
    productId: product?.id,
    productName: product?.name,
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<{ tone: "success" | "notice" | "error"; message: string } | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  function setField<K extends keyof EnquiryInput>(key: K, value: EnquiryInput[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBanner(null);

    const parsed = enquirySchema.safeParse(values);
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !(key in errors)) {
          errors[key as keyof EnquiryInput] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    startTransition(async () => {
      const result = await submitEnquiry(values);

      if (result.status === "success") {
        setBanner({ tone: "success", message: "Thank you — we'll be in touch shortly." });
        setValues({ ...EMPTY_VALUES, productId: product?.id, productName: product?.name });
        void sendEnquiryEmailJs(values);
        return;
      }

      if (result.status === "not_configured") {
        setBanner({ tone: "notice", message: result.message });
        return;
      }

      setFieldErrors(result.fieldErrors ?? {});
      setBanner({ tone: "error", message: result.message });
    });
  }

  if (banner?.tone === "success") {
    return (
      <p className="flex items-center gap-3 font-body text-body-lg text-on-surface">
        <CheckCircle2 size={22} className="text-secondary shrink-0" aria-hidden="true" />
        {banner.message}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {banner && (
        <p
          role="alert"
          className={cn(
            "flex items-start gap-3 border px-4 py-3 font-body text-body",
            banner.tone === "notice"
              ? "border-secondary/40 bg-secondary/5 text-on-surface"
              : "border-error/40 bg-error/5 text-error",
          )}
        >
          <AlertCircle size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
          {banner.message}
        </p>
      )}

      <Field label="Name" htmlFor="enquiry-name" error={fieldErrors.name}>
        <input
          id="enquiry-name"
          name="name"
          type="text"
          required
          value={values.name}
          onChange={(e) => setField("name", e.target.value)}
          aria-invalid={Boolean(fieldErrors.name)}
          className={inputClasses(Boolean(fieldErrors.name))}
        />
      </Field>

      <Field label="Email" htmlFor="enquiry-email" error={fieldErrors.email}>
        <input
          id="enquiry-email"
          name="email"
          type="email"
          required
          value={values.email}
          onChange={(e) => setField("email", e.target.value)}
          aria-invalid={Boolean(fieldErrors.email)}
          className={inputClasses(Boolean(fieldErrors.email))}
        />
      </Field>

      <Field label="Phone (optional)" htmlFor="enquiry-phone" error={fieldErrors.phone}>
        <input
          id="enquiry-phone"
          name="phone"
          type="tel"
          value={values.phone ?? ""}
          onChange={(e) => setField("phone", e.target.value)}
          aria-invalid={Boolean(fieldErrors.phone)}
          className={inputClasses(Boolean(fieldErrors.phone))}
        />
      </Field>

      <Field label="Product" htmlFor="enquiry-product" error={fieldErrors.productName}>
        <input
          id="enquiry-product"
          name="productName"
          type="text"
          readOnly={Boolean(product)}
          placeholder={product ? undefined : "Which tile or stone are you asking about?"}
          value={values.productName ?? ""}
          onChange={(e) => setField("productName", e.target.value)}
          aria-invalid={Boolean(fieldErrors.productName)}
          className={cn(inputClasses(Boolean(fieldErrors.productName)), product && "bg-surface-variant")}
        />
      </Field>

      <Field label="Message" htmlFor="enquiry-message" error={fieldErrors.message}>
        <textarea
          id="enquiry-message"
          name="message"
          required
          rows={5}
          value={values.message}
          onChange={(e) => setField("message", e.target.value)}
          aria-invalid={Boolean(fieldErrors.message)}
          className={cn(inputClasses(Boolean(fieldErrors.message)), "resize-none")}
        />
      </Field>

      <Button type="submit" variant="primary" size="lg" disabled={isPending} className="w-full sm:w-auto">
        {isPending ? "Sending..." : "Send Enquiry"}
      </Button>
    </form>
  );
}

function inputClasses(hasError: boolean) {
  return cn(
    "w-full border bg-surface px-4 py-3 font-body text-body text-on-surface placeholder:text-on-surface-variant transition-colors focus:outline-none",
    hasError ? "border-error" : "border-outline-variant focus:border-secondary",
  );
}

type FieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
};

function Field({ label, htmlFor, error, children }: FieldProps) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 block font-body text-label uppercase tracking-widest text-on-surface-variant"
      >
        {label}
      </label>
      {children}
      {error && (
        <p className="mt-2 font-body text-sm text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
