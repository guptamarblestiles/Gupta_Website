"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Route-level error boundary. The root layout only supplies <html>/<body>
 * (Navbar/Footer are rendered per page, like not-found.tsx), so the failed
 * page's chrome is gone and is re-rendered here once. Never prints
 * error.message.
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    console.error("Route error boundary caught:", error, {
      digest: error.digest,
    });
  }, [error]);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <>
      <Navbar variant="light" />
      <main id="main-content" className="pt-16 md:pt-20 pb-20">
        <section className="py-section-gap">
          <Container className="max-w-xl text-center mx-auto">
            <p className="font-body text-label uppercase text-secondary-strong mb-4">
              Gupta Interior
            </p>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="font-display text-headline-mobile md:text-headline-tablet lg:text-headline text-on-surface mb-6 focus:outline-none"
            >
              Something went wrong on our side
            </h1>
            <p
              role="alert"
              className="font-body text-body-lg text-on-surface-variant leading-relaxed mb-10"
            >
              We couldn&apos;t load this page just now. This is usually
              temporary &mdash; please try again in a moment. If it keeps
              happening, get in touch and we&apos;ll help you directly.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={() => reset()}
              >
                Try again
              </Button>
              <Button href="/" variant="secondary" size="lg">
                Back to Home
              </Button>
            </div>
            <p className="mt-8 font-body text-body text-on-surface-variant">
              Need help?{" "}
              <Link
                href="/contact"
                className="text-secondary-strong underline underline-offset-4"
              >
                Contact us
              </Link>
            </p>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
