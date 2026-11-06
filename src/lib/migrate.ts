import { db } from "./db";

/**
 * Adds database columns/tables that newer versions of the site need, so the owner never
 * has to paste SQL into Supabase after an update. Runs once per server start, and only
 * does anything when something is missing. Every statement is safe to run again.
 * (The same SQL is in db/migrations/ for reference and for manual use.)
 */
const MIGRATIONS: { name: string; sql: string }[] = [
  {
    name: "002_appearance",
    sql: `
      alter table settings add column if not exists accent_color text not null default '#a65a2e';
      alter table settings add column if not exists bg_darkness int not null default 45
        check (bg_darkness between 0 and 90);
      create table if not exists assets (
        key          text primary key,
        content_type text not null,
        data         bytea not null,
        updated_at   timestamptz not null default now()
      );
      alter table assets enable row level security;`,
  },
  {
    name: "003_tagline",
    sql: `
      alter table settings add column if not exists tagline_et text;
      alter table settings add column if not exists tagline_en text;`,
  },
  {
    name: "004_service_archive",
    sql: `alter table services add column if not exists archived boolean not null default false;`,
  },
];
const NEEDED_COLUMNS: Record<string, string[]> = {
  settings: ["accent_color", "bg_darkness", "tagline_et", "tagline_en"],
  services: ["archived"],
};

let pending: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  pending ??= run().catch((e) => {
    pending = null; // try again on the next request
    console.error("ensureSchema failed", e);
  });
  return pending;
}

async function run() {
  const sql = db();
  const cols = await sql`
    select table_name, column_name from information_schema.columns
    where table_schema = 'public' and table_name in ('settings', 'services')`;
  const [{ assets }] = await sql`select to_regclass('public.assets') is not null as assets`;
  const have = new Set(cols.map((c) => `${c.table_name}.${c.column_name}`));
  const complete = Object.entries(NEEDED_COLUMNS).every(([table, names]) => names.every((n) => have.has(`${table}.${n}`)));
  if (assets && complete) return;

  for (const m of MIGRATIONS) {
    await sql.unsafe(m.sql);
    console.log(`ensureSchema: applied ${m.name}`);
  }
}
