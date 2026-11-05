import { isValidFeedToken } from "@/lib/calendarFeed";
import { db } from "@/lib/db";
import { makeCalendar } from "@/lib/ics";
import { site } from "@/lib/site";

/**
 * The owner's private calendar feed. Apple Calendar (or any calendar app) subscribes to it
 * and shows every confirmed booking; cancelled ones disappear on the next refresh.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/calendar/[token]">) {
  const { token } = await ctx.params;
  if (!isValidFeedToken(token)) return new Response("Not found", { status: 404 });

  const rows = await db()`
    select b.id, b.starts_at, b.ends_at, b.customer_name, b.phone, b.email, b.note,
           s.name_et as service, s.price_eur
    from bookings b join services s on s.id = b.service_id
    where b.status = 'confirmed' and b.ends_at > now() - interval '60 days'
    order by b.starts_at`;

  const ics = makeCalendar(
    rows.map((r) => ({
      uid: `${r.id}@liisulashes`,
      start: new Date(r.starts_at),
      end: new Date(r.ends_at),
      title: `💅 ${r.customer_name} – ${r.service}`,
      description: [
        `${r.service} · ${Number(r.price_eur)} €`,
        `Tel: ${r.phone}`,
        `E-post: ${r.email}`,
        r.note ? `Märkus: ${r.note}` : "",
        `${site.url}/admin/bookings`,
      ]
        .filter(Boolean)
        .join("\n"),
      alarmMinutesBefore: 60,
    })),
    { name: `${site.name} – broneeringud`, feed: true },
  );

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="broneeringud.ics"',
      "Cache-Control": "no-store",
    },
  });
}
