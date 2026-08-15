"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Email-capture control for the CTA band. UI-complete and validated, but
 * intentionally not wired to a backend yet — Supabase isn't connected
 * until task 8/11 (this isn't the product-enquiry flow, brief section 40,
 * which gets its own form later). Swapping the TODO for a real insert is a
 * one-line change once `lib/supabase/client.ts` exists.
 */
export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setStatus("error");
      return;
    }
    // TODO(task 8): insert into a Supabase `subscribers` table once connected.
    setStatus("success");
  }

  if (status === "success") {
    return (
      <p className="flex items-center gap-2 font-body text-body-lg text-hero-foreground">
        <Check size={18} className="text-secondary" aria-hidden="true" />
        Thank you — we&apos;ll be in touch.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col sm:flex-row gap-3" noValidate>
      <div className="flex-1">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          placeholder="Enter your email"
          className={cn(
            "w-full bg-transparent border px-5 py-4 font-body text-body text-hero-foreground placeholder:text-hero-muted transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary",
            status === "error" ? "border-error" : "border-hero-border focus:border-secondary",
          )}
          aria-invalid={status === "error"}
          aria-describedby={status === "error" ? "newsletter-error" : undefined}
        />
        {status === "error" && (
          <p id="newsletter-error" className="mt-2 font-body text-sm text-error">
            Please enter a valid email address.
          </p>
        )}
      </div>
      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 bg-secondary px-6 py-4 font-body text-label uppercase tracking-widest text-white transition-colors duration-300 hover:bg-secondary-fixed-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hero-foreground"
      >
        Subscribe
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    </form>
  );
}
