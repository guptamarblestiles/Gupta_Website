/**
 * In-memory Postgres (PGlite) with just enough of Supabase's platform
 * stubbed in — the anon/authenticated roles, auth.users + auth.uid(), and
 * storage.objects — to apply every migration in ../../supabase/migrations
 * in order and exercise the RLS policies as a real signed-in user would.
 *
 * Not a substitute for running against the real project: it proves the SQL
 * applies cleanly on a schema built from the same migrations, and that the
 * policies/triggers behave as designed.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const MIGRATIONS_DIR = join(import.meta.dirname, "..", "..", "..", "supabase", "migrations");

const PLATFORM_STUBS = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

create schema storage;
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null,
  name text not null,
  metadata jsonb,
  created_at timestamptz not null default now(),
  unique (bucket_id, name)
);
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated, service_role;
grant all on storage.objects to anon, authenticated, service_role;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`;

export type Db = PGlite & {
  as: <T>(user: string | null, fn: () => Promise<T>) => Promise<T>;
};

export async function createDb(): Promise<Db> {
  const db = new PGlite();
  await db.exec(PLATFORM_STUBS);
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    try {
      await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf-8"));
    } catch (err) {
      throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
    }
  }

  /** Run fn as `authenticated` with the given auth.users id (null = anon). */
  const as = async <T>(user: string | null, fn: () => Promise<T>): Promise<T> => {
    await db.exec(`set role ${user ? "authenticated" : "anon"}`);
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user ?? ""]);
    try {
      return await fn();
    } finally {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub', '', false)");
    }
  };

  return Object.assign(db, { as });
}

export const ids = {
  owner: "00000000-0000-0000-0000-000000000001",
  editor: "00000000-0000-0000-0000-000000000002",
  viewer: "00000000-0000-0000-0000-000000000003",
  stranger: "00000000-0000-0000-0000-000000000004",
};

/** Four auth users; three of them admins, as the SQL editor (superuser) would set up. */
export async function seedUsers(db: Db) {
  for (const [name, id] of Object.entries(ids)) {
    await db.query("insert into auth.users (id, email) values ($1, $2)", [id, `${name}@example.com`]);
  }
  await db.query(
    `insert into public.admin_users (user_id, email, role) values
     ($1, 'owner@example.com', 'owner'), ($2, 'editor@example.com', 'editor'), ($3, 'viewer@example.com', 'viewer')`,
    [ids.owner, ids.editor, ids.viewer],
  );
}
