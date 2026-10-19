import "server-only";
import { buildDemoData, DEMO_USER, type StorageObjects, type Tables } from "@/lib/demo/data";

/**
 * Demo mode only. A small in-memory stand-in for the parts of supabase-js /
 * PostgREST this app uses: select with embeds, filters, or(), order, range,
 * counts, insert/update/delete/upsert, the admin RPCs, Storage listing and
 * the auth calls. It mimics the important database rules (status <->
 * is_visible, publishing needs an image, unique product codes/slugs, audit
 * log) so the screens behave realistically. Data lives in server memory
 * and resets when the dev server restarts. Never used in production.
 */

type Row = Record<string, unknown>;
type State = { tables: Tables; storage: StorageObjects; auditSeq: number };

const g = globalThis as unknown as { __adminDemo?: State };
function state(): State {
  if (!g.__adminDemo) {
    const d = buildDemoData();
    g.__adminDemo = { ...d, auditSeq: 1000 };
  }
  return g.__adminDemo;
}

let idSeq = 0;
const newId = () => `00000000-0000-4000-a000-${String(Date.now() % 1e8).padStart(8, "0")}${String(++idSeq).padStart(4, "0")}`;

class PgError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

// FK names used to resolve embeds like products(count) or source_pdfs(title).
const FK: Record<string, string> = { products: "product_id", source_pdfs: "source_pdf_id" };
const PRIMARY_KEY: Record<string, string> = { admin_users: "user_id" };
const UNIQUE: Record<string, string[]> = { products: ["product_code", "slug"], source_pdfs: ["slug", "original_filename", "sha256"], categories: ["name", "slug"] };

function unquote(v: string): string {
  if (v.startsWith('"') && v.endsWith('"')) {
    try {
      return JSON.parse(v);
    } catch {
      return v.slice(1, -1);
    }
  }
  return v;
}

function likeToRegex(pattern: string, insensitive: boolean): RegExp {
  const esc = pattern.replace(/\\([%_\\])/g, "\u0000$1").replace(/[.*+?^${}()|[\]]/g, "\\$&");
  const body = esc.replace(/%/g, ".*").replace(/_/g, ".").replace(/\u0000(.)/g, (_, c) => (c === "\\" ? "\\\\" : c));
  return new RegExp(`^${body}$`, insensitive ? "is" : "s");
}

function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quoted = false;
  let cur = "";
  for (const ch of s) {
    if (ch === '"') quoted = !quoted;
    if (!quoted && ch === "(") depth++;
    if (!quoted && ch === ")") depth--;
    if (!quoted && depth === 0 && ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}

type Pred = (r: Row) => boolean;

function compare(op: string, value: unknown, raw: string): boolean {
  switch (op) {
    case "eq":
      return String(value ?? "") === raw && value !== null && value !== undefined;
    case "neq":
      return value !== null && value !== undefined && String(value) !== raw;
    case "ilike":
      return typeof value === "string" && likeToRegex(raw, true).test(value);
    case "like":
      return typeof value === "string" && likeToRegex(raw, false).test(value);
    case "is":
      return raw === "null" ? value === null || value === undefined : String(value) === raw;
    case "in": {
      const list = splitTop(raw.replace(/^\(|\)$/g, "")).map(unquote);
      return list.includes(String(value));
    }
    default:
      return true;
  }
}

function parseOr(expr: string, all = false): Pred {
  const preds = splitTop(expr).map((term): Pred => {
    const m = term.match(/^(and|or)\((.*)\)$/s);
    if (m) return parseOr(m[2], m[1] === "and");
    const [col, op, ...rest] = term.split(".");
    const raw = unquote(rest.join("."));
    return (r) => compare(op, r[col], raw);
  });
  return all ? (r) => preds.every((p) => p(r)) : (r) => preds.some((p) => p(r));
}

type Embed = { name: string; alias: string; cols: string };

function parseSelect(cols: string): { embeds: Embed[] } {
  const embeds: Embed[] = [];
  for (const m of cols.matchAll(/(\w+)(?:!\w+)?\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g)) embeds.push({ name: m[1], alias: m[1], cols: m[2] });
  return { embeds };
}

function embedFor(parentTable: string, row: Row, e: Embed): unknown {
  const s = state();
  const child = s.tables[e.name] ?? [];
  const parentFk = FK[parentTable];
  const childFk = FK[e.name];
  if (parentFk && child.length && parentFk in (child[0] ?? {})) {
    // one-to-many: child rows point at the parent
    const rows = child.filter((c) => c[parentFk] === row.id);
    if (e.cols.trim() === "count") return [{ count: rows.length }];
    return rows.map((r) => withEmbeds(e.name, r, e.cols));
  }
  if (childFk && childFk in row) {
    // many-to-one: parent row points at the child
    const target = child.find((c) => c.id === row[childFk]);
    return target ? withEmbeds(e.name, target, e.cols) : null;
  }
  return parentTable === "products" && e.name === "product_images" ? [] : null;
}

function withEmbeds(table: string, row: Row, cols: string): Row {
  const { embeds } = parseSelect(cols);
  if (!embeds.length) return { ...row };
  const out: Row = { ...row };
  for (const e of embeds) out[e.alias] = embedFor(table, row, e);
  return out;
}

function audit(table: string, action: string, row: Row, changes: unknown = null) {
  if (!["products", "source_pdfs", "categories", "catalogues", "admin_users", "enquiries"].includes(table)) return;
  const s = state();
  s.tables.audit_log.unshift({
    id: ++s.auditSeq,
    occurred_at: new Date().toISOString(),
    actor_id: DEMO_USER.id,
    actor_email: DEMO_USER.email,
    action,
    entity_type: table,
    entity_id: (row.id ?? row.user_id) as string,
    entity_label: (row.name ?? row.title ?? row.email ?? null) as string | null,
    changes,
  });
}

/** The database rules from the migration that matter for the UI. */
function applyRules(table: string, row: Row, before: Row | null) {
  const s = state();
  if (table === "products") {
    if (!before) {
      row.status ??= "published";
      row.is_visible = row.status === "published";
    } else if (row.status !== before.status) {
      row.is_visible = row.status === "published";
      if (row.status === "published" && !s.tables.product_images.some((i) => i.product_id === row.id)) {
        throw new PgError("P0001", "Add at least one product image before publishing.");
      }
    }
    row.archived_at = row.status === "archived" ? (before?.archived_at ?? new Date().toISOString()) : null;
  }
  for (const col of UNIQUE[table] ?? []) {
    if (row[col] == null) continue;
    const clash = s.tables[table].find((r) => r !== before && r[col] === row[col] && r.id !== row.id);
    if (clash) throw new PgError("23505", `duplicate key value violates unique constraint "${table}_${col}_key"`);
  }
}

class Query implements PromiseLike<{ data: unknown; error: PgError | null; count: number | null }> {
  private preds: Pred[] = [];
  private orders: { col: string; asc: boolean; nullsFirst?: boolean }[] = [];
  private from = 0;
  private to = Infinity;
  private mode: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private cols = "*";
  private countMode = false;
  private head = false;
  private singleMode: "one" | "maybe" | null = null;
  private payload: Row | Row[] | null = null;
  private upsertOpts: { onConflict?: string; ignoreDuplicates?: boolean } = {};
  private returning = false;

  constructor(private table: string) {}

  select(cols = "*", opts?: { count?: string; head?: boolean }) {
    this.cols = cols;
    if (this.mode !== "select") this.returning = true;
    if (opts?.count) this.countMode = true;
    if (opts?.head) this.head = true;
    return this;
  }
  insert(rows: Row | Row[]) {
    this.mode = "insert";
    this.payload = rows;
    return this;
  }
  upsert(rows: Row | Row[], opts: { onConflict?: string; ignoreDuplicates?: boolean } = {}) {
    this.mode = "upsert";
    this.payload = rows;
    this.upsertOpts = opts;
    return this;
  }
  update(patch: Row, opts?: { count?: string }) {
    this.mode = "update";
    this.payload = patch;
    if (opts?.count) this.countMode = true;
    return this;
  }
  delete(opts?: { count?: string }) {
    this.mode = "delete";
    if (opts?.count) this.countMode = true;
    return this;
  }
  eq(col: string, v: unknown) {
    this.preds.push((r) => r[col] === v || (v != null && r[col] != null && String(r[col]) === String(v)));
    return this;
  }
  neq(col: string, v: unknown) {
    this.preds.push((r) => r[col] != null && String(r[col]) !== String(v));
    return this;
  }
  in(col: string, list: unknown[]) {
    const set = new Set(list.map(String));
    this.preds.push((r) => set.has(String(r[col])));
    return this;
  }
  is(col: string, v: null | boolean) {
    this.preds.push((r) => {
      const val = col in r ? r[col] : this.embedValue(r, col);
      if (v === null) return val === null || val === undefined || (Array.isArray(val) && val.length === 0);
      return val === v;
    });
    return this;
  }
  not(col: string, op: string, v: unknown) {
    this.preds.push((r) => !compare(op, r[col], String(v)));
    return this;
  }
  ilike(col: string, pattern: string) {
    const re = likeToRegex(pattern, true);
    this.preds.push((r) => typeof r[col] === "string" && re.test(r[col] as string));
    return this;
  }
  like(col: string, pattern: string) {
    const re = likeToRegex(pattern, false);
    this.preds.push((r) => typeof r[col] === "string" && re.test(r[col] as string));
    return this;
  }
  overlaps(col: string, list: unknown[]) {
    this.preds.push((r) => Array.isArray(r[col]) && (r[col] as unknown[]).some((x) => list.includes(x)));
    return this;
  }
  or(expr: string) {
    this.preds.push(parseOr(expr));
    return this;
  }
  order(col: string, opts: { ascending?: boolean; nullsFirst?: boolean } = {}) {
    this.orders.push({ col, asc: opts.ascending !== false, nullsFirst: opts.nullsFirst });
    return this;
  }
  range(from: number, to: number) {
    this.from = from;
    this.to = to;
    return this;
  }
  limit(n: number) {
    this.to = this.from + n - 1;
    return this;
  }
  maybeSingle() {
    this.singleMode = "maybe";
    return this;
  }
  single() {
    this.singleMode = "one";
    return this;
  }

  private embedValue(r: Row, name: string) {
    return embedFor(this.table, r, { name, alias: name, cols: "id" });
  }

  private matches(rows: Row[]) {
    return rows.filter((r) => this.preds.every((p) => p(r)));
  }

  private run(): { data: unknown; error: PgError | null; count: number | null } {
    const s = state();
    const table = (s.tables[this.table] ??= []);
    try {
      if (this.mode === "select") {
        let rows = this.matches(table);
        const count = rows.length;
        if (this.orders.length) {
          rows = [...rows].sort((a, b) => {
            for (const o of this.orders) {
              const x = a[o.col];
              const y = b[o.col];
              if (x === y) continue;
              if (x == null) return o.nullsFirst === false || (o.nullsFirst === undefined && o.asc) ? 1 : -1;
              if (y == null) return o.nullsFirst === false || (o.nullsFirst === undefined && o.asc) ? -1 : 1;
              const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true });
              return o.asc ? c : -c;
            }
            return 0;
          });
        }
        if (this.head) return { data: null, error: null, count };
        rows = rows.slice(this.from, this.to === Infinity ? undefined : this.to + 1).map((r) => withEmbeds(this.table, r, this.cols));
        return this.finish(rows, this.countMode ? count : null);
      }

      if (this.mode === "insert" || this.mode === "upsert") {
        const list = (Array.isArray(this.payload) ? this.payload : [this.payload]) as Row[];
        const out: Row[] = [];
        for (const input of list) {
          const keys = this.upsertOpts.onConflict?.split(",").map((k) => k.trim());
          const existing = keys ? table.find((r) => keys.every((k) => r[k] != null && r[k] === input[k])) : undefined;
          if (existing) {
            if (this.upsertOpts.ignoreDuplicates) continue;
            const before = { ...existing };
            Object.assign(existing, input, { updated_at: new Date().toISOString() });
            applyRules(this.table, existing, before);
            out.push(existing);
            continue;
          }
          const pk = PRIMARY_KEY[this.table] ?? "id";
          const row: Row = { [pk]: input[pk] ?? newId(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...input };
          if (this.table === "pdf_import_candidates") row.status ??= "pending";
          if (this.table === "enquiries") row.status ??= "new";
          applyRules(this.table, row, null);
          table.push(row);
          audit(this.table, "created", row);
          out.push(row);
        }
        return this.finish(this.returning ? out.map((r) => withEmbeds(this.table, r, this.cols)) : null, out.length);
      }

      if (this.mode === "update") {
        const rows = this.matches(table);
        for (const row of rows) {
          const before = { ...row };
          Object.assign(row, this.payload, { updated_at: new Date().toISOString() });
          try {
            applyRules(this.table, row, before);
          } catch (err) {
            Object.keys(row).forEach((k) => delete row[k]);
            Object.assign(row, before);
            throw err;
          }
          const changes: Record<string, [unknown, unknown]> = {};
          for (const k of Object.keys(this.payload as Row)) {
            if (k !== "updated_at" && JSON.stringify(before[k]) !== JSON.stringify(row[k])) changes[k] = [before[k] ?? null, row[k] ?? null];
          }
          if (Object.keys(changes).length) {
            const verb =
              this.table === "products" && "status" in changes
                ? row.status === "published"
                  ? "published"
                  : row.status === "archived"
                    ? "archived"
                    : before.status === "archived"
                      ? "restored"
                      : before.status === "published"
                        ? "unpublished"
                        : "updated"
                : "updated";
            audit(this.table, verb, row, changes);
          }
        }
        return this.finish(this.returning ? rows.map((r) => withEmbeds(this.table, r, this.cols)) : null, rows.length);
      }

      // delete
      const doomed = this.matches(table);
      s.tables[this.table] = table.filter((r) => !doomed.includes(r));
      if (this.table === "products") {
        const ids = new Set(doomed.map((r) => r.id));
        s.tables.product_images = s.tables.product_images.filter((i) => !ids.has(i.product_id));
        for (const c of s.tables.pdf_import_candidates) if (ids.has(c.product_id)) c.product_id = null;
      }
      if (this.table === "source_pdfs") {
        const ids = new Set(doomed.map((r) => r.id));
        s.tables.pdf_import_candidates = s.tables.pdf_import_candidates.filter((c) => !ids.has(c.source_pdf_id));
      }
      for (const r of doomed) audit(this.table, "deleted", r);
      return this.finish(null, doomed.length);
    } catch (err) {
      const e = err instanceof PgError ? err : new PgError("XX000", (err as Error).message);
      return { data: null, error: e, count: null };
    }
  }

  private finish(rows: Row[] | null, count: number | null) {
    if (this.singleMode) {
      const list = rows ?? [];
      if (!list.length) {
        return this.singleMode === "one"
          ? { data: null, error: new PgError("PGRST116", "JSON object requested, multiple (or no) rows returned"), count }
          : { data: null, error: null, count };
      }
      return { data: list[0], error: null, count };
    }
    return { data: rows, error: null, count };
  }

  then<A = { data: unknown; error: PgError | null; count: number | null }, B = never>(
    onfulfilled?: ((value: { data: unknown; error: PgError | null; count: number | null }) => A | PromiseLike<A>) | null,
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected);
  }
}

/* ---------------------------------------------------------------- RPCs */

function filterValues() {
  const s = state();
  const out = new Map<string, { filter: string; value: string; total: number; published: number }>();
  const add = (filter: string, value: unknown, published: boolean) => {
    if (value == null || value === "") return;
    const key = `${filter}\u0000${value}`;
    const cur = out.get(key) ?? { filter, value: String(value), total: 0, published: 0 };
    cur.total++;
    if (published) cur.published++;
    out.set(key, cur);
  };
  for (const p of s.tables.products) {
    const pub = p.status === "published";
    add("category", p.category, pub);
    for (const f of ["finish", "size", "color", "pattern", "thickness", "material"]) add(f, p[f], pub);
    add("application", p.application ?? p.wall_or_floor, pub);
    add("series", p.series ?? p.collection, pub);
    for (const r of (p.rooms as string[]) ?? []) add("rooms", r, pub);
  }
  return [...out.values()];
}

function rpc(fn: string, args: Record<string, unknown>) {
  const s = state();
  try {
    switch (fn) {
      case "admin_filter_values":
        return { data: filterValues(), error: null };
      case "admin_set_product_images": {
        const pid = args.p_product_id as string;
        const urls = (args.p_image_urls as string[]) ?? [];
        const keep = s.tables.product_images.filter((i) => i.product_id === pid && urls.includes(i.image_url as string));
        s.tables.product_images = s.tables.product_images.filter((i) => i.product_id !== pid);
        urls.forEach((url, i) => {
          const existing = keep.find((k) => k.image_url === url);
          s.tables.product_images.push(existing ? { ...existing, sort_order: i } : { id: newId(), product_id: pid, image_url: url, sort_order: i, created_at: new Date().toISOString() });
        });
        return { data: null, error: null };
      }
      case "admin_rename_filter_value": {
        const col = args.p_column as string;
        const from = args.p_from as string;
        const to = String(args.p_to).trim();
        let n = 0;
        for (const p of s.tables.products) {
          if (col === "rooms") {
            const rooms = (p.rooms as string[]) ?? [];
            if (rooms.includes(from)) {
              p.rooms = [...new Set(rooms.map((r) => (r === from ? to : r)))].sort();
              n++;
            }
          } else if (col === "series" ? (p.series ?? p.collection) === from : col === "application" ? (p.application ?? p.wall_or_floor) === from : p[col] === from) {
            p[col] = to;
            if (col === "application" && ["Wall", "Floor", "Both"].includes(to)) p.wall_or_floor = to;
            n++;
          }
        }
        if (col === "category" && !s.tables.categories.some((c) => c.name === to)) {
          const cat = s.tables.categories.find((c) => c.name === from);
          if (cat) cat.name = to;
        }
        return { data: n, error: null };
      }
      case "admin_media_objects": {
        const bucket = args.p_bucket as string;
        const search = ((args.p_search as string | null) ?? "").toLowerCase();
        const urlRefs = (name: string) => (u: unknown) => typeof u === "string" && u.endsWith(`/${bucket}/${name}`);
        let rows = (s.storage[bucket] ?? [])
          .filter((o) => !search || o.name.toLowerCase().includes(search))
          .map((o) => {
            const imgs = s.tables.product_images.filter((i) => urlRefs(o.name)(i.image_url));
            const published = imgs.filter((i) => s.tables.products.find((p) => p.id === i.product_id)?.status === "published");
            const other =
              s.tables.categories.filter((c) => urlRefs(o.name)(c.image_url)).length +
              s.tables.catalogues.filter((c) => urlRefs(o.name)(c.pdf_url) || urlRefs(o.name)(c.thumbnail_url)).length +
              s.tables.source_pdfs.filter((p) => p.storage_path === o.name).length;
            return { name: o.name, size_bytes: o.size, mime_type: o.mime, created_at: o.created_at, product_refs: imgs.length, published_refs: published.length, other_refs: other };
          });
        if (args.p_unused_only) rows = rows.filter((r) => r.product_refs + r.other_refs === 0);
        rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
        const total = rows.length;
        const offset = (args.p_offset as number) ?? 0;
        const limit = (args.p_limit as number) ?? 60;
        return { data: rows.slice(offset, offset + limit).map((r) => ({ ...r, total_count: total })), error: null };
      }
      case "admin_broken_product_images":
        return { data: [], error: null };
      default:
        return { data: null, error: new PgError("PGRST202", `Unknown function ${fn}`) };
    }
  } catch (err) {
    return { data: null, error: err as PgError };
  }
}

/* ------------------------------------------------------------- client */

function storageApi(bucket: string) {
  const s = state();
  return {
    async list(folder: string, opts: { search?: string } = {}) {
      const objs = (s.storage[bucket] ?? []).filter((o) => o.name.startsWith(`${folder}/`) && (!opts.search || o.name.includes(opts.search)));
      return { data: objs.map((o) => ({ name: o.name.slice(folder.length + 1), metadata: { size: o.size } })), error: null };
    },
    async createSignedUploadUrl() {
      return { data: null, error: new Error("Demo mode: files aren't uploaded.") };
    },
    async remove(paths: string[]) {
      s.storage[bucket] = (s.storage[bucket] ?? []).filter((o) => !paths.includes(o.name));
      return { data: null, error: null };
    },
    getPublicUrl(path: string) {
      return { data: { publicUrl: `https://demo.invalid/${bucket}/${path}` } };
    },
  };
}

export function createFakeClient() {
  return {
    from: (table: string) => new Query(table),
    rpc: async (fn: string, args: Record<string, unknown> = {}) => rpc(fn, args),
    storage: { from: storageApi },
    auth: {
      getClaims: async () => ({ data: { claims: { sub: DEMO_USER.id, email: DEMO_USER.email } }, error: null }),
      signInWithPassword: async () => ({ data: {}, error: null }),
      signOut: async () => ({ error: null }),
      updateUser: async () => ({ data: {}, error: null }),
      resetPasswordForEmail: async () => ({ data: {}, error: null }),
      exchangeCodeForSession: async () => ({ data: {}, error: null }),
      verifyOtp: async () => ({ data: {}, error: null }),
      admin: {
        listUsers: async () => ({ data: { users: state().tables.admin_users.map((u) => ({ id: u.user_id, email: u.email })) }, error: null }),
        createUser: async ({ email }: { email: string }) => ({ data: { user: { id: newId(), email } }, error: null }),
      },
    },
  };
}
