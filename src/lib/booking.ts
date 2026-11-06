import { randomBytes } from "node:crypto";
import { db, getSettings, type Booking, type Service, type Settings } from "./db";
import { computeSlots } from "./slots";
import { addMinutes } from "./time";

export function bookingWindow(settings: Settings, now = new Date()) {
  return {
    notBefore: new Date(now.getTime() + settings.min_notice_hours * 3600_000),
    notAfter: new Date(now.getTime() + settings.max_days_ahead * 86400_000),
  };
}

/** All bookable start times for one service, from now until the booking horizon. */
export async function getSlots(service: Service, settings?: Settings): Promise<Date[]> {
  return (await getSlotsForServices([service], settings))[0];
}

/**
 * Bookable start times for several services at once. The free time and bookings are loaded
 * only once (2 queries in total), however many services there are.
 */
export async function getSlotsForServices(services: Service[], settings?: Settings): Promise<Date[][]> {
  const s = settings ?? (await getSettings());
  const { notBefore, notAfter } = bookingWindow(s);
  const until = addMinutes(notAfter, 24 * 60);
  const sql = db();
  const [availability, busy] = await Promise.all([
    sql`select starts_at as start, ends_at as "end" from availability
        where ends_at > ${notBefore}::timestamptz and starts_at < ${until}::timestamptz`,
    sql`select starts_at as start, blocked_until as "end" from bookings
        where status = 'confirmed' and blocked_until > ${notBefore}::timestamptz
          and starts_at < ${until}::timestamptz`,
  ]);
  return services.map((service) =>
    computeSlots({
      availability: availability as unknown as { start: Date; end: Date }[],
      busy: busy as unknown as { start: Date; end: Date }[],
      durationMin: service.duration_min,
      bufferMin: service.buffer_min,
      stepMin: s.slot_step_min,
      notBefore,
      notAfter,
    }),
  );
}

export type NewBooking = {
  service: Service;
  startsAt: Date;
  name: string;
  phone: string;
  email: string;
  note: string;
  lang: "et" | "en";
};

export type CreateResult = { ok: true; booking: Booking } | { ok: false; reason: "taken" };

export async function createBooking(b: NewBooking): Promise<CreateResult> {
  // Check again on the server: the time must still be free and inside free time.
  const slots = await getSlots(b.service);
  if (!slots.some((s) => s.getTime() === b.startsAt.getTime())) return { ok: false, reason: "taken" };

  const endsAt = addMinutes(b.startsAt, b.service.duration_min);
  const blockedUntil = addMinutes(endsAt, b.service.buffer_min);
  const token = randomBytes(18).toString("base64url");
  try {
    const [row] = await db()`
      insert into bookings (service_id, starts_at, ends_at, blocked_until, customer_name,
                            phone, email, note, lang, token, terms_accepted_at)
      values (${b.service.id}, ${b.startsAt}::timestamptz, ${endsAt}::timestamptz,
              ${blockedUntil}::timestamptz, ${b.name}, ${b.phone}, ${b.email}, ${b.note},
              ${b.lang}, ${token}, now())
      returning *`;
    return { ok: true, booking: row as unknown as Booking };
  } catch (e) {
    // 23P01 = the "no overlapping bookings" rule: someone was a moment faster.
    if ((e as { code?: string }).code === "23P01") return { ok: false, reason: "taken" };
    throw e;
  }
}

export async function getBookingByToken(token: string) {
  if (!token || token.length > 64) return null;
  const [row] = await db()`
    select b.*, s.name_et, s.name_en, s.price_eur, s.duration_min
    from bookings b join services s on s.id = b.service_id
    where b.token = ${token}`;
  return (row as unknown as BookingWithService) ?? null;
}

export type BookingWithService = Booking & {
  name_et: string;
  name_en: string;
  price_eur: string;
  duration_min: number;
};
