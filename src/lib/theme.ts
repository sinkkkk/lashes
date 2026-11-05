import { cache } from "react";
import { db } from "./db";

/** The site's look, set in /admin → Seaded → Välimus. */
export type Theme = { accent: string; bgDarkness: number; bgUrl: string };

export const DEFAULT_ACCENT = "#a65a2e"; // copper
export const DEFAULT_DARKNESS = 45;
export const DEFAULT_BG = "/brand/background.webp";

export const ACCENT_PRESETS = [
  { name: "Vask", hex: "#a65a2e" },
  { name: "Roos", hex: "#b9776a" },
  { name: "Kuld", hex: "#a8812f" },
  { name: "Salvei", hex: "#5f7a5c" },
  { name: "Ploom", hex: "#7a4a6b" },
  { name: "Must", hex: "#2b2523" },
];

export function cleanAccent(x: unknown): string {
  return typeof x === "string" && /^#[0-9a-f]{6}$/i.test(x.trim()) ? x.trim().toLowerCase() : DEFAULT_ACCENT;
}

export function cleanDarkness(x: unknown): number {
  const n = Math.round(Number(x));
  return Number.isFinite(n) ? Math.min(90, Math.max(0, n)) : DEFAULT_DARKNESS;
}

/**
 * Never fails: if the look settings were not set up in the database yet, defaults are used.
 * Cached per request, so the layout and the page share one lookup.
 */
export const getTheme = cache(async function getTheme(): Promise<Theme> {
  const sql = db();
  let accent = DEFAULT_ACCENT;
  let bgDarkness = DEFAULT_DARKNESS;
  let bgUrl = DEFAULT_BG;
  try {
    const [s] = await sql`select * from settings where id = 1`;
    accent = cleanAccent(s?.accent_color);
    if (s?.bg_darkness != null) bgDarkness = cleanDarkness(s.bg_darkness);
  } catch (e) {
    console.error("theme: settings", e);
  }
  try {
    const [a] = await sql`select updated_at from assets where key = 'background'`;
    if (a) bgUrl = `/api/brand/background?v=${new Date(a.updated_at).getTime()}`;
  } catch {
    // assets table not created yet (db/migrations/002_appearance.sql): use the built-in photo
  }
  return { accent, bgDarkness, bgUrl };
});

/** CSS that sets the accent colour for the whole page. */
export function themeCss(t: Pick<Theme, "accent">) {
  return `:root{--accent:${cleanAccent(t.accent)}}`;
}
