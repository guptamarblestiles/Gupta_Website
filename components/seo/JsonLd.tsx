/** Renders a single JSON-LD <script> block from a plain data object.
 *  Server-safe — no "use client" needed since it's static markup, no
 *  interactivity. Always pass our own generated data, never raw
 *  user-submitted text (e.g. enquiry form input). */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
