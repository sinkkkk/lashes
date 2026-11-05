import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { et as etLocale, enGB } from "date-fns/locale";
import type { Lang } from "./i18n";

/** The studio is in Estonia: every time on the site is shown in Tallinn time. */
export const TZ = "Europe/Tallinn";

const locales = { et: etLocale, en: enGB };

export function fmt(d: Date | string, pattern: string, lang: Lang = "et") {
  return formatInTimeZone(new Date(d), TZ, pattern, { locale: locales[lang] });
}

/** "2026-11-05" in Tallinn time */
export function dayKey(d: Date | string) {
  return formatInTimeZone(new Date(d), TZ, "yyyy-MM-dd");
}

/** Midnight in Tallinn for a "yyyy-MM-dd" day */
export function startOfDayTallinn(day: string) {
  return fromZonedTime(`${day}T00:00:00`, TZ);
}

export function addMinutes(d: Date, min: number) {
  return new Date(d.getTime() + min * 60_000);
}

export function formatDuration(min: number, lang: Lang) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (lang === "et") return [h ? `${h} h` : "", m ? `${m} min` : ""].filter(Boolean).join(" ");
  return [h ? `${h}h` : "", m ? `${m}min` : ""].filter(Boolean).join(" ");
}

export function formatPrice(eur: number) {
  return `${Number.isInteger(eur) ? eur : eur.toFixed(2)} €`;
}
