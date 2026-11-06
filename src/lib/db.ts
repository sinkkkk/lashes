import { getCloudflareContext } from "@opennextjs/cloudflare";
import postgres from "postgres";

type Sql = postgres.Sql;

// One shared connection pool, also across hot reloads in development.
const g = globalThis as unknown as { __sql?: Sql };

/** True when running on Cloudflare Workers. */
const onCloudflare = () => typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

/**
 * On Cloudflare the database is reached through Hyperdrive (binding HYPERDRIVE in wrangler.jsonc).
 * Cloudflare can't open an SSL connection to Supabase itself (Supabase's certificate isn't from a
 * public authority); Hyperdrive does that part and keeps connections warm next to the database.
 */
type Hyperdrive = { connectionString: string };

function connect(cloudflare = false, hyperdrive?: Hyperdrive): Sql {
  const url = hyperdrive?.connectionString ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (see .env.example)");
  const local = /localhost|127\.0\.0\.1|host=\/tmp/.test(url);
  return postgres(url, {
    max: 5,
    // On Cloudflare every page view has its own connection, so skip the extra type lookup.
    fetch_types: !cloudflare,
    prepare: false, // works with Supabase's connection pooler
    // Hyperdrive is reached inside Cloudflare's network and does the SSL to Supabase itself.
    ssl: local || hyperdrive ? false : "require",
    idle_timeout: 20,
    // A connection that can't be opened within 10s is given up on (default 30s), so a rare
    // stuck connection on a freshly started server doesn't leave a page hanging.
    connect_timeout: 10,
  });
}

/**
 * Cloudflare Workers can't share a database connection between visitors' requests, so there
 * each request gets its own connection (kept for that request only).
 */
const perRequest = new WeakMap<object, Sql>();

/** Lazily created so that `next build` works without a database. */
export function db(): Sql {
  if (onCloudflare()) {
    const { ctx, env } = getCloudflareContext();
    let sql = perRequest.get(ctx);
    if (!sql) {
      sql = connect(true, (env as { HYPERDRIVE?: Hyperdrive }).HYPERDRIVE);
      perRequest.set(ctx, sql);
    }
    return sql;
  }
  if (!g.__sql) g.__sql = connect();
  return g.__sql;
}

export type Service = {
  id: string;
  name_et: string;
  name_en: string;
  description_et: string;
  description_en: string;
  duration_min: number;
  buffer_min: number;
  price_eur: number;
  photo_url: string;
  sort: number;
  active: boolean;
  /** Colour for colour-coding in the admin; null = the accent colour */
  color: string | null;
};

export type Booking = {
  id: string;
  service_id: string;
  starts_at: Date;
  ends_at: Date;
  blocked_until: Date;
  customer_name: string;
  phone: string;
  email: string;
  note: string;
  lang: "et" | "en";
  status: "confirmed" | "cancelled";
  token: string;
  gcal_event_id: string | null;
  created_at: Date;
};

export type Settings = {
  slot_step_min: number;
  min_notice_hours: number;
  max_days_ahead: number;
  terms_et: string;
  terms_en: string;
  google_refresh_token: string | null;
};

export type Review = {
  id: string;
  booking_id: string | null;
  rating: number;
  text: string;
  name_display: string;
  approved: boolean;
  created_at: Date;
};

function toService(r: Record<string, unknown>): Service {
  return { ...(r as unknown as Service), price_eur: Number(r.price_eur), color: (r.color as string | null) ?? null };
}

/** Customer site: active services. Admin (onlyActive = false): everything except deleted (archived) ones. */
export async function getServices(onlyActive = true): Promise<Service[]> {
  const sql = db();
  const rows = onlyActive
    ? await sql`select * from services where active order by sort, name_et`
    : await sql`select * from services where not coalesce((to_jsonb(services) ->> 'archived')::boolean, false) order by sort, name_et`;
  return rows.map(toService);
}

export async function getService(id: string): Promise<Service | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [r] = await db()`select * from services where id = ${id}`;
  return r ? toService(r) : null;
}

export async function getSettings(): Promise<Settings> {
  const [r] = await db()`select * from settings where id = 1`;
  return r as unknown as Settings;
}
