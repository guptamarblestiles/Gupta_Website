"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { subscribeNewsletter } from "@/lib/enquiry/actions";

/**
 * Email-capture control for the CTA band. Submits through the
 * subscribeNewsletter server action, which stores the address as a labelled
 * row in the enquiries table and emails the owner. Success is only shown
 * once the address has actually been saved.
 */
export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("Please enter a valid email address.");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      setStatus("error");
      return;
    }
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof subscribeNewsletter>>;
      try {
        result = await subscribeNewsletter({ email, website });
      } catch {
        setErrorMessage("Something went wrong. Please try again in a moment.");
        setStatus("error");
        return;
      }
      if (result.status === "success") {
        setStatus("success");
        return;
      }
      setErrorMessage(
        result.status === "error" && result.fieldErrors?.email
          ? result.fieldErrors.email
          : result.message,
      );
      setStatus("error");
    });
  }

  if (status === "success") {
    return (
      <p role="status" className="flex items-center gap-2 font-body text-body-lg text-hero-foreground">
        <Check size={18} className="text-secondary" aria-hidden="true" />
        Thank you — we&apos;ll be in touch.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col sm:flex-row gap-3" noValidate>
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="newsletter-website">Leave this field empty</label>
        <input
          id="newsletter-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>
      <div className="flex-1">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          required
          maxLength={254}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          placeholder="Enter your email"
          className={cn(
            "h-12 w-full border-0 border-b bg-transparent px-0 font-body text-body text-hero-foreground placeholder:font-display placeholder:italic placeholder:text-hero-muted transition-colors duration-500 ease-luxury focus-visible:outline-none",
            status === "error" ? "border-error" : "border-hero-border focus:border-secondary",
          )}
          aria-invalid={status === "error"}
          aria-describedby={status === "error" ? "newsletter-error" : undefined}
        />
        {status === "error" && (
          <p id="newsletter-error" role="alert" className="mt-2 font-body text-sm text-error">
            {errorMessage}
          </p>
        )}
      </div>
      <Button type="submit" variant="hero-primary" disabled={isPending}>
        {isPending ? "Sending..." : "Subscribe"}
        <ArrowRight size={16} aria-hidden="true" />
      </Button>
    </form>
  );
}
