/** Escapes "<" (so "</script>" in data cannot close the tag early) and the
 *  U+2028/U+2029 line separators. Output is still valid JSON. */
function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/** Renders a single JSON-LD <script> block from a plain data object.
 *  Server-safe — no "use client" needed since it's static markup, no
 *  interactivity. Always pass our own generated data, never raw
 *  user-submitted text (e.g. enquiry form input). */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
