import { getBookingByToken } from "@/lib/booking";
import { makeIcs } from "@/lib/ics";
import { site } from "@/lib/site";

export async function GET(_req: Request, ctx: RouteContext<"/api/bookings/[token]/ics">) {
  const { token } = await ctx.params;
  const b = await getBookingByToken(token);
  if (!b || b.status !== "confirmed") return new Response("Not found", { status: 404 });
  const ics = makeIcs({
    uid: `${b.id}@liisulashes`,
    start: new Date(b.starts_at),
    end: new Date(b.ends_at),
    title: `${b.lang === "et" ? b.name_et : b.name_en} – ${site.name}`,
    description: `${site.url}/${b.lang}/booking/${b.token}`,
    location: site.address,
  });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="liisu-lashes.ics"',
    },
  });
}
