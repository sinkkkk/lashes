import { db, type Booking, type Service } from "@/lib/db";
import { ensureSchema } from "@/lib/migrate";
import { sendReminder, sendReviewRequest } from "@/lib/notify";
import { dayKey, startOfDayTallinn } from "@/lib/time";

/**
 * Runs once a day (see vercel.json; Vercel's free plan allows daily jobs).
 * - Reminds everyone who has an appointment tomorrow.
 * - Asks for a review from everyone whose appointment ended in the last 7 days.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  await ensureSchema();
  const sql = db();
  const today = dayKey(new Date());
  const tomorrowStart = startOfDayTallinn(dayKey(new Date(startOfDayTallinn(today).getTime() + 36 * 3600_000)));
  const dayAfterStart = startOfDayTallinn(dayKey(new Date(tomorrowStart.getTime() + 36 * 3600_000)));

  const reminders = await sql`
    select b.*, row_to_json(s) as service from bookings b join services s on s.id = b.service_id
    where b.status = 'confirmed' and b.reminder_sent_at is null
      and b.starts_at >= ${tomorrowStart}::timestamptz and b.starts_at < ${dayAfterStart}::timestamptz`;
  for (const r of reminders) {
    const s = r.service as Service;
    await sendReminder(r as unknown as Booking, { ...s, price_eur: Number(s.price_eur) });
    await sql`update bookings set reminder_sent_at = now() where id = ${r.id}`;
  }

  const reviews = await sql`
    select b.* from bookings b
    where b.status = 'confirmed' and b.review_requested_at is null
      and b.ends_at < now() - interval '1 hour' and b.ends_at > now() - interval '7 days'
      and not exists (select 1 from reviews r where r.booking_id = b.id)
      and not exists (select 1 from email_optouts o where o.email = lower(b.email))`;
  for (const r of reviews) {
    await sendReviewRequest(r as unknown as Booking);
    await sql`update bookings set review_requested_at = now() where id = ${r.id}`;
  }

  return Response.json({ reminders: reminders.length, reviewRequests: reviews.length });
}
