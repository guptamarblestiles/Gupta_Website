/**
 * Formatting-only normalization for catalogue values. It never changes what
 * a value MEANS (a manufacturer's "Satin Matt" stays "Satin Matt"); it only
 * removes the spacing/case noise that would otherwise split one filter
 * option into several on the public site ("600 X 600 MM" vs "600x600mm").
 */

export function cleanText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const v = value.replace(/\s+/g, " ").trim();
  return v === "" ? null : v;
}

/** "600 X 1200 MM" -> "600x1200mm", "60 x 120 cm" -> "60x120cm",
 *  "2 x 4 ft" -> "2x4ft". Unrecognised formats are returned cleaned but
 *  otherwise untouched. */
export function normalizeSize(value: string | null | undefined): string | null {
  const v = cleanText(value);
  if (!v) return null;
  const m = v.match(/^(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*(mm|cm|ft|feet|in|inch|inches|")?$/i);
  if (!m) return v;
  const unit = (m[3] ?? "").toLowerCase().replace(/^feet$/, "ft").replace(/^(inch|inches|")$/, "in");
  return `${m[1]}x${m[2]}${unit}`;
}

/** "9MM", "9 mm", "9.0 mm" -> "9 mm" (the format the curated import used). */
export function normalizeThickness(value: string | null | undefined): string | null {
  const v = cleanText(value);
  if (!v) return null;
  const m = v.match(/^(\d+(?:\.\d+)?)\s*mm$/i);
  if (!m) return v;
  return `${Number(m[1])} mm`;
}

/** Comparison key for spotting near-duplicate filter values that are
 *  probably the same thing typed differently. Used only to SUGGEST a merge;
 *  merging always needs a human to confirm. */
export function similarityKey(value: string): string {
  return (normalizeSize(value) ?? value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .replace(/s$/, "");
}

export type DuplicateGroup = { key: string; values: string[] };

export function findNearDuplicates(values: string[]): DuplicateGroup[] {
  const groups = new Map<string, Set<string>>();
  for (const value of values) {
    const key = similarityKey(value);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, new Set());
    groups.get(key)!.add(value);
  }
  return [...groups.entries()]
    .filter(([, set]) => set.size > 1)
    .map(([key, set]) => ({ key, values: [...set].sort() }));
}

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\.pdf$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** First of base, base-2, base-3 ... not in `taken`. */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const root = slugify(base) || "item";
  if (!used.has(root)) return root;
  for (let n = 2; ; n++) {
    const candidate = `${root}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
}

/** Safe object name for Storage: lowercase, no spaces/unicode, keeps extension. */
export function safeFileName(name: string, fallbackExt = ""): string {
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : fallbackExt;
  const base = slugify(dot > 0 ? name.slice(0, dot) : name) || "file";
  return ext ? `${base}.${ext}` : base;
}

/** Display title from a PDF file name: "GUPTA_Marble-Tiles_2026.pdf" -> "Gupta Marble Tiles 2026". */
export function titleFromFileName(name: string): string {
  return name
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** India-first phone handling for click-to-call / WhatsApp links. */
export function phoneLinks(raw: string | null | undefined): { tel: string; whatsapp: string } | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.length < 10 || digits.length > 15) return null;
  return { tel: `+${digits}`, whatsapp: `https://wa.me/${digits}` };
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
