"use client";

import { useEffect } from "react";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Last-resort boundary for failures in the root layout itself. Replaces the
 * whole document, so it brings its own <html>/<body> and uses inline styles
 * only (no Tailwind/fonts assumed loaded). Never prints error.message.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("Global error boundary caught:", error, { digest: error.digest });
  }, [error]);

  const buttonBase = {
    display: "inline-block",
    padding: "14px 32px",
    fontSize: "12px",
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    textDecoration: "none",
    cursor: "pointer",
    fontFamily: "inherit",
  };

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#18181b",
          color: "#f5f3ef",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <main style={{ maxWidth: "520px" }}>
          <p
            style={{
              fontSize: "12px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#b8a27a",
              margin: "0 0 16px",
            }}
          >
            Gupta Interior
          </p>
          <h1
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontWeight: 400,
              fontSize: "34px",
              lineHeight: 1.2,
              margin: "0 0 20px",
            }}
          >
            Something went wrong on our side
          </h1>
          <p role="alert" style={{ fontSize: "16px", lineHeight: 1.6, color: "#c9c5bd", margin: "0 0 32px" }}>
            We couldn&apos;t load the site just now. Please try again in a moment.
          </p>
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{ ...buttonBase, background: "#f5f3ef", color: "#18181b", border: "1px solid #f5f3ef" }}
            >
              Try again
            </button>
            {/* Plain anchor on purpose: a full document reload, not client routing. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ ...buttonBase, background: "transparent", color: "#f5f3ef", border: "1px solid #6b675f" }}>
              Reload site
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
